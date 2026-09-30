# Développement par le doute (Doubt-Driven Development)

## À quoi ça sert

Ce n'est pas une phase, c'est un **état d'esprit permanent**. Il s'applique à
chaque décision, pendant qu'on écrit le code.

La revue sous pression arrive à la fin et attaque le résultat. Le DDD, lui,
attaque **la décision au moment où tu la prends** — quand c'est encore gratuit de
changer d'avis.

> « On utilise le pattern X. »
> Non. D'abord : *pourquoi* X ?

## Le réflexe

Pour chaque choix d'architecture, de bibliothèque ou de structure, trois questions.
Si tu n'as pas la réponse, le choix n'est pas justifié — il est **habitué**.

### 1. Pourquoi cette solution, et pas une plus simple ?

Écris la raison. « C'est le standard », « tout le monde le fait », « c'est dans la
doc » ne sont pas des raisons.

Le biais par défaut, c'est la complexité gratuite : un abstray, une couche, un
framework, parce que le cas pourrait un jour le justifier. Il le justifiera peut-être
dans deux ans. Il ne le justifie pas aujourd'hui.

### 2. Quel est l'impact si le besoin change ?

Le vrai coût d'un choix n'est pas son écriture, c'est son **débouchage**.

- Si le besoin double, combien de fichiers je touche ?
- Si je dois remplacer la dépendance, est-ce que c'est un paramètre ou 40 appels ?
- Y a-t-il un couplage fort entre deux modules quiTU n'avais pas prévu ?

Un choix difficile à défaire se justifie par un besoin **actuel**, pas probable.

### 3. Puis-je le prouver ?

Un doute sur un choix technique se lève par une **preuve**, pas par un argument.
Prototype rapide, POC, expérience isolée, mesure.

## Discipline du POC

Un POC n'est pas une mini-version du projet. C'est une expérience jetable qui
répond à **une seule question**.

| Ce qui en fait un bon POC | Ce qui en fait du gaspillage |
|---|---|
| Une question précise, formulable en une phrase | « Voir si ça marche » |
| Un temps borné (quelques heures) | Untiler jusqu'à ce que ce soit propre |
| Jetable après la réponse | Du code destined à la prod |
| Mesure, pas opinion | « Ça paraissait bien » |

Si le POC n'a pas Destroyé ta question précise, tu n'as pas fait un POC.

## Sortie attendue

Il n'y a pas de livrable, par construction. Ce qui change : **les choix non
justifiés disparaissent du code** au lieu d'y rester pour toujours. Une conception
plus sobre, parce que chaque ligne survit à la question « pourquoi c'est là ? ».

## Pièges

- **Le doute paralysant.** Tout doubté, on ne livre rien. On doute des choix, on
  livre quand même si le doute est faible et le risque faible.
- **Le cargo cult.** « C'est l'architecture micro-services » n'est pas un
  argument, c'est un réflexe. Aucune architecture n'est bonne en soi.
- **Douter après coup.** Le DDD practised en relecture ne sert plus à rien, c'est
  de la revue tardive.
- **Confondre doute et paresse.** Re-douter de tout à chaque décision est aussi
  un piège : ça décourage d'agir. Doute **localement**, sur la décision courante.
