# n8n — Workflows personnels

Deux workflows d'automatisation versioning en **Workflow SDK** (`.workflow.ts`), le format natif de
[`n8ncli`](https://www.npmjs.com/package/n8n-cli). Ils tournent sur une instance **n8n Cloud**.

---

## Ce que fait ce dépôt

Deux automatisations indépendantes, sans point commun entre elles sinon ce dépôt :

| Workflow | Problème résolu | Pour qui |
|---|---|---|
| [`workflows/workflow-edt.workflow.ts`](workflows/workflow-edt.workflow.ts) — **EDT** | Transformer l'email hebdomadaire de notes de l'école en planning Notion + rendez-vous Google Calendar | Parent d'élèves, une fois par semaine |
| [`workflows/rag-supabase.workflow.ts`](workflows/rag-supabase.workflow.ts) — **RAG Supabase** | Indexer des documents dans Supabase et y poser des questions en langage naturel | Qui interroge sa base documentaire |

**EDT** lit un mail, en extrait les informations structurées (petit-déjeuner, tenue, tâches,
rendez-vous), publie une page Notion hebdomadaire, et crée les rendez-vous dans l'agenda.
Il tourne en moins de 5 s et coûte quasi rien.

**RAG Supabase** a deux entrées : un formulaire qui ingère un document, et un chat qui répond
en se fondant sur les extraits retrouvés. Le PDF passe par extraction → chunking → vectorisation
dans la table `documents` ; la question passe par réécriture → recherche vectorielle → reranking
→ génération ancrée sur le contexte.

---

## Prérequis

- **Node.js 18+**
- **`n8ncli`** installé globalement :

```bash
npm install -g n8n-cli
```

- Un accès à une **instance n8n** (ici : `https://sarahranganadane.app.n8n.cloud`)
- Un **jeton MCP** de l'instance, pour `n8ncli`

---

## Démarrage

```bash
# 1. Cloner
git clone https://github.com/r-sarah/rendu-n8n-sarah.git
cd rendu-n8n-sarah

# 2. Initialiser la config locale du dépôt
n8ncli init --url "https://<ton-instance>.n8n.cloud" --env development

# 3. Enregistrer l'accès à l'instance
n8ncli envs edit development --url "https://<ton-instance>.n8n.cloud" --access-token "<mcp_token>"
```

`n8ncli init` crée `n8n/config/` (versionné) et des fichiers ignorés par git : c'est normal.

---

## Commandes utiles

```bash
# Valider un workflow contre les schémas n8n
n8ncli validate workflows\workflow-edt.workflow.ts

# Vérifier la conformité aux standards du dépôt
n8ncli lint workflows\workflow-edt.workflow.ts

# Déployer vers l'instance n8n
n8ncli push --all
```

> **Exception :** `rag-supabase.workflow.ts` épingle `extractFromFile` en version 1. La 1.1 masque
> `binaryPropertyName` pour l'opération `pdf`, ce qui casserait l'ingestion. Valider avec
> `n8ncli validate --no-version-check workflows\rag-supabase.workflow.ts`.

---

## Format des fichiers

Les `.workflow.ts` **n'ont pas de ligne `import`**. C'est délibéré : `n8ncli` refuse les
déclarations d'import dans les fichiers versionnés, il ajoute l'import à la volée au moment de
l'appeler l'API MCP. Ne pas l'ajouter.

```typescript
// Pas d'import ici — n8ncli l'ajoute au moment de l'appel.

const chatTrigger = trigger({
  type: '@n8n/n8n-nodes-langchain.chatTrigger',
  version: 1.5,
  config: {
    name: 'When chat message received',
    parameters: { public: true, options: {} },
    notes: 'Point d entree de l answering.'
  }
});

export default workflow('id', 'Nom du workflow')
  .add(chatTrigger)
  .to(maPremiereEtape);
```

---

## Identifiants référencés

Aucun secret n'est versionné : les credentials sont référencés **par nom** via `newCredential()`.
Il faut les recréer ou les renommer dans l'instance à l'import.

| Workflow | Nœud | Type | Nom attendu |
|---|---|---|---|
| EDT | Gmail Trigger | `gmailOAuth2` | `sarah gmail` |
| EDT | Creer la page | `notionOAuth2Api` | `Notion account` |
| EDT | Creer l evenement | `googleCalendarOAuth2Api` | `agenda` |
| RAG | Embeddings Google Gemini | `googlePalmApi` | `api` |
| RAG | Gemini - Reecriture / Reranking / Generation | `googlePalmApi` | `api` |
| RAG | Supabase Vector Store / Recherche vectorielle Supabase | `supabaseApi` | `n8n rag` |

Le workflow RAG utilise deux modèles distincts, à ne pas confondre :
`gemini-embedding-001` pour l'embedding (identique à l'ingestion **et** à la recherche, sinon les
vecteurs deviennent incomparables), `gemini-3-flash-preview` pour le langage.

---

## Exemples d'utilisation

### RAG Supabase — indexer un document

Dans l'instance n8n, ouvrir le workflow et utiliser le formulaire : un seul champ, un PDF.
Les pages sont découpées en fenêtres de 1000 caractères avec 150 de chevauchement, puis
vectorisées dans la table `documents`.

### RAG Supabase — poser une question

Ouvrir l'URL du chat (champ **Chat URL** du nœud `When chat message received`) :

> **Qui sont les personnages principaux de l'histoire ?**
>
> → *Le narrateur, tante Jeannette, Joséphine, Jihad…* (extraits 1 et 2)

Le reranking écarte les extraits hors sujet avant la génération, et la réponse cite l'extrait
qui l'a fondée.

### EDT — résumer la semaine

Un mail de synthèse arrive sur la boîte `sarah gmail` → Notion et Google Calendar se mettent à
jour sans intervention. Le nœud **Test manuel** permet de rejouer la chaîne sans attendre le
prochain mail.

---

## Standards non respectés (assumés)

`n8ncli lint` signale des avertissements volontairement acceptés :

- **Noms et descriptions en anglais** — les workflows sont en français, on assume.
- **Title Case** — les noms de nœuds suivent la casse du français, pas le `Title Case` anglais.

Ces règles se reglent dans `n8n/config/n8n-standards.json`.

---

## Sécurité

Le dépôt est privé. Aucun secret en clair n'est versionné.

Le `.gitignore` exclut `.n8ncli-global.json`, `.n8ncli/` et les caches de synchronisation, qui
contiennent des jetons d'accès actifs.