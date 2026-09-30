// Format Workflow SDK (@n8n/workflow-sdk).
// L import est volontairement absent : n8ncli l interdit dans les fichiers
// versionnes. Il est ajoute a la volee lors des appels MCP.

const gmail = trigger({
  type: 'n8n-nodes-base.gmailTrigger',
  version: 1.4,
  config: {
    name: 'Gmail Trigger',
    parameters: {
      pollTimes: { item: [{ mode: 'everyMinute' }] },
      maxResults: 1,
      filters: { q: 'newer_than:7d', readStatus: 'both', sender: 'sranganadane@eugeniaschool.com', simple: false }
    },
    notes: 'Declenche quand le mail de synthese de la semaine arrive. Polling toutes les minutes.',
    notesInFlow: true,
    credentials: { gmailOAuth2: newCredential('sarah gmail') }
  }
});

const testManuel = trigger({
  type: 'n8n-nodes-base.manualTrigger',
  version: 1,
  config: { name: 'Test manuel', parameters: {}, notes: 'Declencheur de test, a supprimer apres validation.', notesInFlow: true }
});

const emailTest = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Email de test',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: { assignments: [
        { id: 'a1', name: 'text', type: 'string', value: 'Notes de la semaine\n\nPetit-dejeuner :\n- lundi et mardi : Croissant et cafe\n- mercredi : yaourt et muesli\n\nTenue :\n- jeudi : jean bleu et pull gris\n- vendredi : robe noire\n\nTaches :\n- envoyer le devis a M. Perrin avant vendredi\n- acheter le cadeau d anniversaire de Claire\n\nRendez-vous :\n- medecin, jeudi 1 octobre de 14h00 a 15h00, cabinet du Dr Bernard\n- reunion de classe de Lola, vendredi 2 octobre de 18h00 a 20h00, gymnase' },
        { id: 'a2', name: 'subject', type: 'string', value: 'Notes semaine du 29 septembre' }
      ] }
    },
    notes: 'Faux email injecte pour tester la chaine d extraction. A supprimer apres validation.',
    notesInFlow: true
  }
});

const extraire = node({
  type: '@n8n/n8n-nodes-langchain.googleGemini',
  version: 1.2,
  config: {
    name: 'Extraire les elements',
    parameters: {
      resource: 'text',
      operation: 'message',
      modelId: { __rl: true, mode: 'list', value: 'models/gemini-2.5-flash-lite', cachedResultName: 'models/gemini-2.5-flash-lite' },
      messages: { values: [{ content: `=Tu es un assistant qui analyse des notes personnelles hebdomadaires.

Date de reference : nous sommes le {{ $now.setZone('Europe/Paris').toFormat('cccc d LLLL yyyy') }}.
Regle absolute sur les dates : si le texte ne donne pas l annee, utilise l annee de la date de reference et la semaine a venir. N invente jamais d annee. Si le jour de la semaine et la date se contredisent, privilegie la date numerique. Si aucune annee plausible n existe, mets null.

Repere chaque information utile (petit-dejeuner, tenue, tache, rendez-vous) et renvoie UNIQUEMENT un tableau JSON.

Format STRICT, sans texte autour :
[
  {
    "categorie": "Petit-dejeuner" | "Tenue" | "To-Do" | "RDV",
    "contenu_notion": "texte court a inserer dans la page",
    "est_rdv": true | false,
    "rdv_titre": "titre du rendez-vous, ou null",
    "rdv_date_debut": "YYYY-MM-DDTHH:mm:ss, ou null",
    "rdv_date_fin": "YYYY-MM-DDTHH:mm:ss, ou null"
  }
]

Regles :
- Un objet par idee distincte, meme si elles sont sur la meme ligne.
- categorie vaut exactement une des quatre valeurs.
- est_rdv a true uniquement pour un rendez-vous, et alors les deux dates sont obligatoires au format ISO local.

Texte a analyser :
{{ $json.text || $json.snippet }}` }] },
      jsonOutput: true,
      builtInTools: {},
      options: {}
    }
  }
});

const preparer = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Preparer la semaine',
    parameters: { mode: 'runOnceForAllItems', jsCode: `const NL = String.fromCharCode(10);
const ORDRE = ['Petit-dejeuner', 'Tenue', 'To-Do', 'RDV'];
const LIBELLES = { 'Petit-dejeuner': 'Petit-déjeuner', 'Tenue': 'Tenue', 'To-Do': 'À faire', 'RDV': 'Rendez-vous' };
const MOIS = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
const JOURS_MAX_PASSE = 30;
const JOURS_MAX_FUTUR = 400;

function texte(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function deux(n) {
  return (n < 10 ? '0' : '') + n;
}

// Lit une date ISO naive. La chaine est renvoyee telle quelle, sans conversion
// UTC, pour que le noeud Calendar applique le fuseau du calendrier.
function dateIsoValide(v) {
  const s = texte(v);
  if (s.length < 16) return null;
  const an = s.slice(0, 4);
  const mo = s.slice(5, 7);
  const jo = s.slice(8, 10);
  const hh = s.slice(11, 13);
  const mi = s.slice(14, 16);
  if (isNaN(Number(an)) || isNaN(Number(mo)) || isNaN(Number(jo))) return null;
  if (isNaN(Number(hh)) || isNaN(Number(mi))) return null;
  const d = new Date(Number(an), Number(mo) - 1, Number(jo), Number(hh), Number(mi));
  if (isNaN(d.getTime())) return null;
  const jours = (d.getTime() - Date.now()) / 86400000;
  if (jours < -JOURS_MAX_PASSE) return null;
  if (jours > JOURS_MAX_FUTUR) return null;
  return { iso: an + '-' + mo + '-' + jo + 'T' + hh + ':' + mi + ':00', date: d };
}

function parseTableau(s) {
  const i = s.indexOf('[');
  const j = s.lastIndexOf(']');
  if (i >= 0 && j > i) {
    try { return JSON.parse(s.slice(i, j + 1)); } catch (e) { return null; }
  }
  return null;
}

// Deballe les differentes formes de sortie du modele : tableau direct, chaine
// JSON, enveloppe content.parts[0].text, ou objet unique.
function versTableau(brut, profondeur) {
  const p = profondeur || 0;
  if (brut === null || brut === undefined || p > 5) return [];
  if (Array.isArray(brut)) return brut;
  if (typeof brut === 'string') {
    const arr = parseTableau(brut);
    return arr === null ? [] : arr;
  }
  if (typeof brut !== 'object') return [];
  if (texte(brut.categorie) !== '' || texte(brut.contenu_notion) !== '') return [brut];
  if (brut.content) {
    if (typeof brut.content === 'string') {
      const arr = parseTableau(brut.content);
      if (arr !== null) return arr;
    }
    if (brut.content.parts) {
      for (const part of brut.content.parts) {
        if (part && typeof part.text === 'string') {
          const arr = parseTableau(part.text);
          if (arr !== null) return arr;
        }
      }
    }
  }
  for (const cle of ['response', 'output', 'text', 'data', 'body', 'message', 'result', 'elements', 'items']) {
    if (brut[cle] !== undefined) {
      const res = versTableau(brut[cle], p + 1);
      if (res.length > 0) return res;
    }
  }
  for (const cle of Object.keys(brut)) {
    if (Array.isArray(brut[cle])) {
      const res = versTableau(brut[cle], p + 1);
      if (res.length > 0) return res;
    }
  }
  return [];
}

function numeroSemaine(d) {
  const c = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const jour = c.getUTCDay() || 7;
  c.setUTCDate(c.getUTCDate() + 4 - jour);
  const debut = new Date(Date.UTC(c.getUTCFullYear(), 0, 1));
  return Math.ceil(((c.getTime() - debut.getTime()) / 86400000 + 1) / 7);
}

function court(d) {
  return d.getDate() + ' ' + MOIS[d.getMonth()].slice(0, 4) + '.';
}

function heure(d) {
  return deux(d.getHours()) + 'h' + deux(d.getMinutes());
}

function isoNaif(d) {
  return d.getFullYear() + '-' + deux(d.getMonth() + 1) + '-' + deux(d.getDate()) +
    'T' + deux(d.getHours()) + ':' + deux(d.getMinutes()) + ':' + deux(d.getSeconds());
}

const maintenant = new Date();
const decalage = maintenant.getDay() === 0 ? -6 : 1 - maintenant.getDay();
const lundi = new Date(maintenant.getTime());
lundi.setDate(maintenant.getDate() + decalage);
const dimanche = new Date(lundi.getTime());
dimanche.setDate(lundi.getDate() + 6);
const semaineLibelle = 'Semaine ' + numeroSemaine(lundi) + ' · ' + court(lundi) + ' – ' + court(dimanche) + ' ' + dimanche.getFullYear();

const source = $input.first().json || {};
const elements = versTableau(source);

const valides = [];
const rdv = [];
const ignores = [];

for (const e of elements) {
  if (!e || typeof e !== 'object') continue;
  const contenu = texte(e.contenu_notion);
  if (contenu === '') continue;
  let categorie = texte(e.categorie);
  if (ORDRE.indexOf(categorie) === -1) categorie = 'To-Do';
  const estRdv = e.est_rdv === true || texte(e.est_rdv) === 'true' || categorie === 'RDV';
  valides.push({ categorie: categorie, contenu: contenu });
  if (estRdv) {
    const d = dateIsoValide(e.rdv_date_debut);
    if (d === null) {
      ignores.push({ titre: texte(e.rdv_titre) || contenu.slice(0, 60), raison: 'date absente ou hors bornes' });
    } else {
      const f = dateIsoValide(e.rdv_date_fin);
      const fin = (f === null || f.date.getTime() < d.date.getTime())
        ? new Date(d.date.getTime() + 3600000)
        : f.date;
      rdv.push({
        titre: texte(e.rdv_titre) || contenu.slice(0, 80),
        debut: d.iso,
        fin: isoNaif(fin),
        description: contenu
      });
    }
  }
}

const lignes = ['# ' + semaineLibelle, ''];
if (valides.length === 0) {
  lignes.push('Aucun élément exploitable trouvé dans ce message.');
} else {
  for (const cat of ORDRE) {
    const duCat = valides.filter(v => v.categorie === cat);
    if (duCat.length === 0) continue;
    lignes.push('## ' + LIBELLES[cat], '');
    for (const v of duCat) {
      if (cat === 'RDV') {
        const trouve = rdv.find(r => r.description === v.contenu);
        const d = trouve ? dateIsoValide(trouve.debut) : null;
        lignes.push(d ? '- ' + v.contenu + ' (' + court(d.date) + ' ' + heure(d.date) + ')' : '- ' + v.contenu + ' (date a confirmer)');
      } else {
        lignes.push(cat === 'To-Do' ? '- [ ] ' + v.contenu : '- ' + v.contenu);
      }
    }
    lignes.push('');
  }
}
if (ignores.length > 0) {
  lignes.push('> ' + ignores.length + ' rendez-vous non ajoute au calendrier : date absente ou aberrante.');
  lignes.push('');
}

return [{
  json: {
    semaineLibelle: semaineLibelle,
    markdownNotion: lignes.join(NL),
    nbElements: valides.length,
    nbRdv: rdv.length,
    rdv: rdv,
    rendezVousIgnores: ignores
  }
}];` },
    notes: 'Normalise la sortie du modele, calcule le libelle de la semaine, construit le markdown de la page Notion et isole les rendez-vous dates.',
    notesInFlow: true
  }
});

const creerPage = node({
  type: 'n8n-nodes-base.notion',
  version: 3,
  config: {
    name: 'Creer la page',
    parameters: {
      resource: 'page',
      operation: 'create',
      authentication: 'oAuth2',
      pageId: { __rl: true, mode: 'url', value: 'https://app.notion.com/p/test-N8N-3ea08171f9b28087bf49dec73a8b9b73' },
      title: '=Planning — {{ $json.semaineLibelle }}',
      contentType: 'markdown',
      markdown: '={{ $json.markdownNotion }}',
      options: {}
    },
    credentials: { notionOAuth2Api: newCredential('Notion account') }
  }
});

const eclairer = node({
  type: 'n8n-nodes-base.splitOut',
  version: 1,
  config: {
    name: 'Eclater les rendez-vous',
    parameters: { fieldToSplitOut: 'rdv', options: {} },
    notes: 'Un item par rendez-vous. Un tableau vide ne produit aucun item, le noeud Calendar est alors saute.',
    notesInFlow: true
  }
});

const creerEvent = node({
  type: 'n8n-nodes-base.googleCalendar',
  version: 1.3,
  config: {
    name: 'Creer l evenement',
    parameters: {
      resource: 'event',
      operation: 'create',
      calendar: { __rl: true, mode: 'list', value: 'sranganadane@eugeniaschool.com', cachedResultName: 'sranganadane@eugeniaschool.com' },
      start: '={{ $json.debut }}',
      end: '={{ $json.fin }}',
      additionalFields: { summary: '={{ $json.titre }}', description: '={{ $json.description }}' }
    },
    credentials: { googleCalendarOAuth2Api: newCredential('agenda') }
  }
});

const noteObjectif = sticky('## objectif\n chaque semaine, a partir de mes notes, repartir les infos (to do, rdv, petit dej, tenue) sur une page notion hebdomadaire + completer google agenda', [gmail, preparer, creerPage, creerEvent]);
const noteAffirmations = sticky('## affirmations\n- fonctionne en moins de 5s\n- cout quasi nul\n- facilement accessible');
const noteCli = sticky('n8ncli envs edit development --url "https://sarahranganadane.app.n8n.cloud" --access-token "<mcp_token>"');

export default workflow('workflow-edt', 'workflow edt')
  .add(gmail)
  .to(extraire)
  .to(preparer)
  .add(preparer).to(creerPage)
  .add(preparer).to(eclairer)
  .add(eclairer)
  .to(creerEvent)
  .add(testManuel)
  .to(emailTest)
  .to(extraire)
  .add(noteObjectif)
  .add(noteAffirmations)
  .add(noteCli);
