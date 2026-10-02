// Format Workflow SDK (@n8n/workflow-sdk).
// L import est volontairement absent : n8ncli l interdit dans les fichiers
// versionnes. Il est ajoute a la volee lors des appels MCP.

// ─────────────────────────────────────────────────────────────────────────────
// Sous-noeuds IA
// ─────────────────────────────────────────────────────────────────────────────

const embeddingsIngestion = embeddings({
  type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
  version: 1,
  config: {
    name: 'Embeddings Google Gemini',
    parameters: { modelName: 'models/gemini-embedding-001' },
    credentials: { googlePalmApi: newCredential('api') }
  }
});

const embeddingsRecherche = embeddings({
  type: '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
  version: 1,
  config: {
    name: 'Embeddings - Recherche',
    parameters: { modelName: 'models/gemini-embedding-001' },
    credentials: { googlePalmApi: newCredential('api') },
    notes: 'Doit utiliser exactement le meme modele que l ingestion, sinon les vecteurs ne sont plus comparables.',
    notesInFlow: true
  }
});

const dataLoader = documentLoader({
  type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader',
  version: 1.1,
  config: { name: 'Default Data Loader', parameters: {} }
});

const geminiReecriture = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.2,
  config: {
    name: 'Gemini - Reecriture',
    parameters: { modelName: 'models/gemini-3-flash-preview', options: { temperature: 0, maxOutputTokens: 512 } },
    credentials: { googlePalmApi: newCredential('api') }
  }
});

const geminiReranking = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.2,
  config: {
    name: 'Gemini - Reranking',
    parameters: { modelName: 'models/gemini-3-flash-preview', options: { temperature: 0, maxOutputTokens: 256 } },
    credentials: { googlePalmApi: newCredential('api') }
  }
});

const geminiGeneration = languageModel({
  type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
  version: 1.2,
  config: {
    name: 'Gemini - Generation',
    parameters: { modelName: 'models/gemini-3-flash-preview', options: { temperature: 0.2, maxOutputTokens: 2048 } },
    credentials: { googlePalmApi: newCredential('api') }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Partie 1 — Ingestion
// ─────────────────────────────────────────────────────────────────────────────

const onFormSubmission = trigger({
  type: 'n8n-nodes-base.formTrigger',
  version: 2.6,
  config: {
    name: 'On form submission',
    parameters: {
      formTitle: 'fichier',
      formFields: { values: [{ fieldLabel: 'pdf', fieldType: 'file' }] },
      options: {}
    },
    notes: 'Point d entree d ingestion. Seul le champ fichier est accepte.',
    notesInFlow: true
  }
});

const extractPdf = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1,
  config: {
    name: 'Extract text from PDF',
    parameters: { operation: 'pdf', binaryPropertyName: 'pdf', options: { joinPages: false, keepSource: 'json' } },
    notes: 'joinPages false : une sortie par page, ce qui ameliore la granularite du chunking. VERSION 1 VOLONTAIREMENT PINSEE : la 1.1 masque binaryPropertyName pour l operation pdf, ce qui ferait pointer le noeud vers le mauvais champ binaire et casserait l ingestion. Valider avec n8ncli validate --no-version-check.',
    notesInFlow: true
  }
});

const chunkJs = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Code in JavaScript',
    parameters: { mode: 'runOnceForAllItems', jsCode: `// Configuration du chunking
const chunkSize = 1000; // Nombre de caractères par chunk
const overlap = 150;    // Chevauchement pour préserver le contexte
const results = [];

for (const item of $input.all()) {
  // Récupération du tableau de textes ou d'une chaîne brute
  const texts = Array.isArray(item.json.text) ? item.json.text : [item.json.text || ''];

  texts.forEach((fullText, textIndex) => {
    if (!fullText) return;

    let start = 0;
    let chunkIndex = 0;

    // Découpage par tranche de taille (chunkSize) avec chevauchement (overlap)
    while (start < fullText.length) {
      const end = Math.min(start + chunkSize, fullText.length);
      const chunkText = fullText.slice(start, end);

      results.push({
        json: {
          chunk: chunkText,
          chunkIndex: chunkIndex,
          textSourceIndex: textIndex,
          totalChars: fullText.length
        }
      });

      // Si le texte est terminé, on sort de la boucle
      if (end === fullText.length) break;

      // Avancement avec chevauchement
      start += chunkSize - overlap;
      chunkIndex++;
    }
  });
}

return results;` },
    notes: 'Decoupe chaque page en fenetres de 1000 caracteres avec 150 de chevauchement, pour ne pas couper une idee en plein milieu.',
    notesInFlow: true
  }
});

const limitChunks = node({
  type: 'n8n-nodes-base.limit',
  version: 1,
  config: {
    name: 'Limit',
    parameters: { maxItems: 2 },
    notes: 'ATTENTION : bride de test. Ne laisse passer que 2 chunks par PDF. A relever ou supprimer avant un usage reel, sinon l indexation est partielle.',
    notesInFlow: true
  }
});

const callWorkflow = node({
  type: 'n8n-nodes-base.executeWorkflow',
  version: 1.4,
  config: {
    name: 'Call RAG Supabase - Indexer un document',
    parameters: {
      workflowId: { __rl: true, value: 'rag-supabase', mode: 'list' },
      workflowInputs: {
        mappingMode: 'defineBelow',
        value: { content: expr('{{ $json.chunk }}') },
        matchingColumns: ['content'],
        schema: [
          { id: 'content', displayName: 'content', required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false }
        ],
        attemptToConvertTypes: false,
        convertFieldsToString: true
      },
      options: {}
    },
    notes: 'Appelle le sous-workflow qui vectorise et insere. Le workflowId est resolu par n8ncli a l apply, pas fige ici.',
    notesInFlow: true
  }
});

const subWorkflowTrigger = trigger({
  type: 'n8n-nodes-base.executeWorkflowTrigger',
  version: 1.2,
  config: {
    name: 'When Executed by Another Workflow',
    parameters: { workflowInputs: { values: [{ name: 'content' }] } },
    notes: 'Sous-workflow : recoit un chunk, le vectorise et l insere dans la table documents.',
    notesInFlow: true
  }
});

const vectorStoreInsert = vectorStore({
  type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
  version: 1.3,
  config: {
    name: 'Supabase Vector Store',
    parameters: {
      mode: 'insert',
      tableName: { __rl: true, mode: 'list', value: 'documents', cachedResultName: 'documents' },
      options: {}
    },
    credentials: { supabaseApi: newCredential('n8n rag') },
    subnodes: { embedding: embeddingsIngestion, documentLoader: dataLoader }
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Partie 2 — Answering
// ─────────────────────────────────────────────────────────────────────────────

const chatTrigger = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.5,
  config: {
    name: 'When chat message received',
    parameters: {
      public: true,
      initialMessages: 'Bonjour ! Je suis un assistant IA RAG.\nVous pouvez me poser n\'importe quelle question sur le livre "la passe miroir": \n"Qui sont les personnages principal ? ";\n"Comment se termine l\'histoire ? "',
      options: {}
    },
    notes: 'Point d entree de l answering. Mode reponse lastNode : le dernier noeud doit produire un champ output.',
    notesInFlow: true
  }
});

const reecrire = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Reecrire la question',
    parameters: {
      promptType: 'define',
      text: `=Tu es un reformulateur de requêtes pour une base de connaissances vectorielle.

Mission : transformer la question de l'utilisateur en une RECHERCHE AUTONOME, c'est-à-dire
une requête compréhensible même sans le contexte de la conversation, et formulée avec les
mots exacts que l'on retrouverait dans les documents.

Règles :
- Remplace les pronoms et les renvois ("il", "elle", "ça", "celui-là") par les notions qu'ils désignent.
- Conserve les noms propres, les termes techniques et les intentions précises.
- Produis UNE seule requête, en français, sans préambule, sans guillemets et sans explication.
- Si la question est déjà autonome, renvoie-la telle quelle.

Question de l'utilisateur : {{ $json.chatInput }}

Requête de recherche :`,
      hasOutputParser: false,
      needsFallback: false
    },
    subnodes: { model: geminiReecriture },
    notes: 'Etape 1. Les mots de la question polie ("qui sont", "de l histoire") diluent le signal dans l embedding. La reecriture densifie le signal avant la recherche.',
    notesInFlow: true
  }
});

const rechercheVectorielle = vectorStore({
  type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
  version: 1.3,
  config: {
    name: 'Recherche vectorielle Supabase',
    parameters: {
      mode: 'load',
      prompt: expr('{{ $json.text }}'),
      topK: 10,
      includeDocumentMetadata: true,
      useReranker: false,
      tableName: { __rl: true, mode: 'list', value: 'documents', cachedResultName: 'documents' }
    },
    credentials: { supabaseApi: newCredential('n8n rag') },
    subnodes: { embedding: embeddingsRecherche },
    notes: 'Etape 2. Recherche rapide mais grossiere : elle optimise le rappel, pas la precision. topK est un maximum, pas une garantie. useReranker est false car le reranking est fait en aval par un noeud dedie.',
    notesInFlow: true
  }
});

const preparerReranking = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Preparer le reranking',
    parameters: { mode: 'runOnceForAllItems', jsCode: `const TOP_N = 3;
const MAX_CHARS = 1200;

const docs = [];
const push = function (text, score) {
  if (text && String(text).trim().length > 0) {
    docs.push({ text: String(text).slice(0, MAX_CHARS), score: (score === undefined ? null : score) });
  }
};

for (const item of $input.all()) {
  const j = item.json || {};
  if (typeof j.document === 'string') push(j.document, j.score);
  else if (j.document && typeof j.document.pageContent === 'string') push(j.document.pageContent, j.score);
  else if (typeof j.pageContent === 'string') push(j.pageContent, j.score);
  else if (typeof j.text === 'string') push(j.text, j.score);
  else if (typeof j.chunk === 'string') push(j.chunk, j.score);
  else if (Array.isArray(j.documents)) {
    for (const d of j.documents) {
      if (typeof d === 'string') push(d, null);
      else if (d && typeof d.pageContent === 'string') push(d.pageContent, d.score);
    }
  }
}

const candidates = docs;
const candidatesText = candidates
  .map(function (d, i) { return '[' + (i + 1) + '] score=' + (d.score === null ? 'n/a' : d.score) + '\n' + d.text; })
  .join('\n\n----------\n\n');

const rewrite = $('Reecrire la question').first().json || {};
const trigger = $('When chat message received').first().json || {};

return [{
  json: {
    query: String(rewrite.text || trigger.chatInput || ''),
    topN: TOP_N,
    candidateCount: candidates.length,
    candidates: candidates,
    candidatesText: candidatesText
  }
}];` },
    notes: 'Etape 3, deterministe. Normalise les formes de sortie du vector store, tronque a 1200 caracteres pour maitriser le cout en tokens, et numerote les candidats pour que le reranker puisse les designer.',
    notesInFlow: true
  }
});

const reranking = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Reranking IA',
    parameters: {
      promptType: 'define',
      text: `=Tu es un reranker d'extraits de documents.

On te fournit une question et une liste d'extraits numérotés, issus d'une base de connaissances.
Ta tâche : sélectionner les extraits les plus pertinents pour répondre à la question.

Question : {{ $json.query }}

Extraits :
{{ $json.candidatesText }}

Règles :
- Évalue la pertinence par rapport à la question, pas par rapport à la longueur de l'extrait.
- Un extrait pertinent doit contenir l'information recherchée, pas seulement un mot en commun.
- Sélectionne au maximum {{ $json.topN }} extraits, du plus pertinent au moins pertinent.
- Réponds UNIQUEMENT par les numéros séparés par des virgules (exemple : 1,4,7). Aucun autre texte.

Numéros les plus pertinents :`,
      hasOutputParser: false,
      needsFallback: false
    },
    subnodes: { model: geminiReranking },
    notes: 'Etape 4, la plus importante pour la qualite. Convertit du rappel en precision : le vector store rend ses 10 meilleurs voisins meme pour une question etrangere au corpus, ce noeud les classe sur la vraie pertinence.',
    notesInFlow: true
  }
});

const assemblerContexte = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Assembler le contexte',
    parameters: { mode: 'runOnceForAllItems', jsCode: `const prepared = $('Preparer le reranking').first().json || {};
const candidates = Array.isArray(prepared.candidates) ? prepared.candidates : [];
const topN = prepared.topN || 3;
const trigger = $('When chat message received').first().json || {};

const query = String(prepared.query || trigger.chatInput || '');
const rawSelection = String(($json && $json.text) || '');

const found = rawSelection.match(/\d+/g) || [];
const wanted = [];
for (const n of found) {
  const idx = parseInt(n, 10);
  if (idx >= 1 && idx <= candidates.length && wanted.indexOf(idx) === -1) {
    wanted.push(idx);
  }
  if (wanted.length >= topN) break;
}

const picked = wanted.length
  ? wanted.map(function (n) { return { id: n, text: candidates[n - 1].text }; })
  : candidates.slice(0, topN).map(function (c, i) { return { id: i + 1, text: c.text }; });

const context = picked.length
  ? picked.map(function (c) { return '<extrait id="' + c.id + '">\n' + c.text + '\n</extrait>'; }).join('\n\n')
  : "(Aucun extrait pertinent n'a ete trouve dans la base de connaissances.)";

return [{
  json: {
    query: query,
    context: context,
    topN: topN,
    sourceIds: picked.map(function (c) { return c.id; }),
    hasContext: picked.length > 0
  }
}];` },
    notes: 'Etape 5. Balisage <extrait id="N"> pour que la reponse puisse citer ses sources. LIMITE : quand le reranker repond "aucun extrait pertinent", ce noeud ne detecte pas le signal et bascule sur les 3 premiers. La generation refuse alors de repondre, mais uniquement par confiance dans le prompt.',
    notesInFlow: true
  }
});

const genererReponse = node({
  type: '@n8n/n8n-nodes-langchain.chainLlm',
  version: 1.9,
  config: {
    name: 'Generer la reponse',
    parameters: {
      promptType: 'define',
      text: `=Tu es un assistant qui répond en se fondant EXCLUSIVEMENT sur les extraits de documents fournis.

<extraits>
{{ $json.context }}
</extraits>

Question de l'utilisateur : {{ $json.query }}

Règles :
- Réponds en français, de façon claire et directe.
- Appuie chaque affirmation sur les extraits. N'introduis aucune information qui n'y figure pas.
- Si les extraits ne permettent pas de répondre, dis-le clairement et indique ce que tu peux dire.
- Cite le numéro de l'extrait utilisé lorsque tu appuies une affirmation sur celui-ci.
- Va droit au but : pas de préambule, pas de reformulation de la question.

Réponse :`,
      hasOutputParser: false,
      needsFallback: false
    },
    subnodes: { model: geminiGeneration },
    notes: 'Etape 6, seule etape creative. Le prompt impose l ancrage, la citation des sources, et l aveu d ignorance. LIMITE : pas de memoire de conversation, chaque question est traitee en statique.',
    notesInFlow: true
  }
});

const reponseChat = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Reponse chat',
    parameters: { mode: 'raw', jsonOutput: '={{ { output: $json.text } }}' },
    notes: 'Etape 7. Le Chat Trigger est en mode lastNode : il lit le champ output du dernier noeud. Sans cette renommage, le widget affiche une erreur.',
    notesInFlow: true
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Notes
// ─────────────────────────────────────────────────────────────────────────────

const noteObjectif = sticky('## objectif\nRAG complet sur une base de connaissances Supabase : ingestion de PDF, puis reponse en langage naturel ancree sur les extraits.', [reecrire, rechercheVectorielle, genererReponse]);
const notePipeline = sticky('## pipeline answering\n1 reecriture de la requete\n2 recherche vectorielle topK 10\n3 reranking IA top 3\n4 generation ancree\ncout : 3 appels Gemini + 1 embedding par question');
const noteLimites = sticky('## limites connues\n- Limit a 2 chunks par PDF : bride de test\n- pas de memoire : les questions de suivi ne sont pas comprises\n- garde-fou de reranking non deterministe\n- formulaire d ingestion non public');

export default workflow('rag-supabase', 'RAG Supabase - Indexer un document')
  .add(onFormSubmission)
  .to(extractPdf)
  .to(chunkJs)
  .to(limitChunks)
  .to(callWorkflow)
  .add(subWorkflowTrigger)
  .to(vectorStoreInsert)
  .add(chatTrigger)
  .to(reecrire)
  .to(rechercheVectorielle)
  .to(preparerReranking)
  .to(reranking)
  .to(assemblerContexte)
  .to(genererReponse)
  .to(reponseChat)
  .add(noteObjectif)
  .add(notePipeline)
  .add(noteLimites);