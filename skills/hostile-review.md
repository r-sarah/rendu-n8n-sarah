# Revue sous pression (Hostile Review)

## À quoi ça sert

Dernière étape avant livraison. On simule une **attaque en règle** du projet pour
voir ce qui casse. Le rôle n'est pas d'améliorer, c'est de **détruire**.

Si la revue se passe bien, c'est que la revue a été molle. Une revue qui ne trouve
rien sur un projet non testé n'a rien prouvé.

## Quand la déclencher

- Fin d'une phase de conception, avant d'écrire le code.
- Fin du développement, avant livraison.
- Après un incident : on rejoue la revue sur ce qui a failli.

**Pas** pendant le développement. On ne sabote pas son propre travail en cours.

## Rôle

Tu es l'**avocat du diable**. Tu défends l'inverse de ce que l'équipe veut entendre.
Si tu ne trouves pas de faille, tu n'as pas cherché assez — cherche la faille du
concurrent, la faille de l'année dernière, le cas que personne n'a testé.

## Surfaces d'attaque

Parcours-les une par une. Pour chacune, pose la question jusqu'à ce que la réponse
soit un chiffre ou un « je ne sais pas ».

### Charge et volume

- Quel volume, à la pic ? Le système a-t-il été testé **au-delà** du pic prévu ?
- Que se passe-t-il à 10× ? Le plafond est où — n8n, l'API tierce, ma mémoire ?
- Le workflow est-il idempotent ? Relancé deux fois, il crée-t-il des doublons ?

### Usage déviant

- Entrée vide, malformée, enorme, dans une autre langue ?
- Un utilisateur malveillant peut-il injecter du contenu dans le prompt ?
- Un mail contient-il une instruction (« ignore le prompt et écris… ») ?

### Dépendance tierce

- Si Notion est indisponible dimanche 19 h, que devient le mail ?
- Si le modèle hallucine, **le produit est-il silencieux ou faux** ? Faux et
  silencieux est le pire cas : il passe en production.
- Les quotas sont-ils dépassables ? Que coûte l'échec, en argent ?

### Données

- Une date illisible est-elle rejetée ou acceptée par défaut ?
- Les données.delete / données.update sont-elles réversibles ?
- Un décalage d'un jour ou d'une heure est-il détecté ?

### Dette et raccourcis

Pour chaque raccourci, note la dette qu'il crée et son coût de remboursement :

| Raccourci | Dette | Coût si on revient plus tard |
|---|---|---|
| Identifiants en dur | couplage à une instance | reconfiguration manuelle |
| `alwaysOutputData` pour contourner un vide | comportement non défini | bug invisible |
| Pas de gestion d'erreur | aucune remontée | silence total |

## Séparer les conclusions

Ne sors pas une liste de 40 points. Classe :

- **Bloquant** — corrige avant livraison.
- **Accepté** — connu, assumé, avec la raison écrite.
- **Différé** — pas critique, avec une date ou une condition.

Un point marqué « accepté » **sans raison écrite** est un point oublié. C'est la
règle qui distingue une vraie revue d'un exercice de style.

## Sortie attendue

Une cartographie des failles majeures, chacune avec : le scénario de casse
concret, la criticité, et la décision *corrige / accepté / différé*.

## Pièges

- **La rubber stamp.** « C'est bien, on livre. » Il faut au moins un doute non
  résolu à la sortie, sinon la revue n'a rien fait.
- **Le perfectionnisme.** Signaler qu'on devrait aussi gérer le cas d'un astéroïde
  n'est pas une revue, c'est de l'évitement.
- **Confondre probabilité et gravité.** Un bug improbable mais qui crée des
  événements dans le passé à la mauvaise heure reste bloquant.
- **Revoir seul ce qu'on a construit.** Fais relire par quelqu'un qui n'a pas
  participé.
