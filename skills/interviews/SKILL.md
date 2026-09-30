# Interview d'exploration (Discovery Interview)

## À quoi ça sert

L'interlocuteur arrive avec une **solution**. Ton travail, c'est d'en sortir le **problème**.

> « Je veux un tableau de bord qui se remplit tout seul. »
>
> → Ce n'est pas un besoin, c'est une proposition. Le besoin est peut-être
> « je perds du temps à saisir mes rendez-vous ».

Écrire du code avant d'avoir fait cette différence, c'est construire la mauvaise
chose très vite.

## Quand la déclencher

| Situation | Interview ? |
|---|---|
| La demande contient déjà une solution technique (« fais un webhook n8n… ») | **Oui,obligé** |
| La demande est un objectif flou (« je veux mieux m'organiser ») | **Oui** |
| Correction de bug : la cause est évidente et reproductionnée | Non |
| Refonte d'un truc qui marche, avec critères de succès nets | Non |

## Déroulé

### 1. Séparer la solution du problème

Reformule la demande en une phrase qui ne parle **que du problème**, sans nommer
d'outil ni de méthode. Fais valider cette reformulation avant d'aller plus loin.

```
« Je veux un tableau de bord qui se remplit tout seul »
    ↓
« Aujourd'hui, j'écris mes rendez-vous à trois endroits et j'en oublie. »
```

Si tu ne sais pas écrire cette phrase, c'est que l'interview n'est pas finie.

### 2. Les 5 Pourquoi

Pose la question « pourquoi » jusqu'à ce que la réponse soit **organisationnelle**,
pas technique.

```
Pourquoi un tableau de bord ?
  → Pour ne rien oublier.
    Pourquoi l'oubli est-il un problème ?
      → Parce qu'un rendez-vous manqué a un coût réel.
        Pourquoi n'as-tu pas d'alerte aujourd'hui ?
          → Parce que l'information est saisie trois fois, à trois moments différents.
```

Le besoin devient : **réduire la saisie à une seule fois**.

### 3. Challenger le besoin

Vérifie la demande contre les contraintes réelles. Une demande qui les ignore
n'est pas un besoin, c'est un souhait :

- **Budget** — « ça marche en moins de 5 s » : est-ce une exigence ou un souhait ?
- **Temps** — quelle date limite réelle ?
- **Technique** — quelles données sont réellement accessibles ?
- **Métier** — qui d'autre est concerné ? qui valide ?
- **Juridique** — des données personnelles circulent-elles ?

### 4. Explorer les alternatives

Formule au moins deux autres hypothèses, même absurdes. Si tu n'en trouves aucune,
tu n'as probablement pas assez creusé.

Pour « ne rien oublier », les alternatives à un tableau de bord sont :
une seule boîte mail qui parse tout, un rappel la veille sur le téléphone,
une liste unique paper, ne rien noter du tout (peut-être que ça suffit ?).

La bonne réponse est souvent « ne rien noter » ou « une seule saisie ».

### 5. Recenser les irritants actuels

Liste ce qui coince **aujourd'hui**, pas ce qui manquera. Un irritant est un fait
observé, pas une déduction.

## Sortie attendue

Un énoncé de problème en une phrase, la liste des contraintes réelles, les
alternatives écartées **et pourquoi**, et les irritants constatés. Pas encore de
solution.

## Pièges

- **Inquisitionner.** Si la personne a l'impression d'un interrogatoire, elle se
  ferme. Propose des options, tu valides, elle tranche.
- **Enchaîner sur la solution trop tôt.** Dès que tu codes, l'interview est finie
  et le problème est figé.
- **Confondre absence de réponse et consentement.** « Pas de contrainte » veut
  dire « pas demandé », pas « aucune contrainte ».
- **Faire l'interview une seule fois.** Le problème change quand l'utilisateur voit
  un premier résultat.
