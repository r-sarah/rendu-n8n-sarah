# Workflows n8n

Versionnement des workflows n8n en JSON, exportables et relisibles.

## Contenu

| Fichier | Description |
|---|---|
| `workflows/workflow-edt.json` | Hub d'organisation hebdomadaire (brouillon) |

## Importer dans n8n

Depuis l'interface n8n : **Workflows → ⋯ → Import from File**, puis choisir le JSON.
Les identifiants ne sont pas inclus dans le JSON : il faut les réassocier après l'import.

En ligne de commande, avec la CLI officielle :

```powershell
n8n-cli import --input=workflows/workflow-edt.json
```

Avec `n8ncli` (mode GitOps) :

```powershell
n8ncli push --all
```

## Identifiants référencés

Les nœuds pointent vers des identifiants de credential n8n, qui ne sont **jamais**
exportés. Il faut les recréer ou les réassocier à l'import.

| Nœud | Type de credential | Nom dans l'instance source |
|---|---|---|
| Gmail Trigger | `gmailOAuth2` | `sarah gmail` |
| Create a page | `notionOAuth2Api` | `Notion account` |
| Create an event | `googleCalendarOAuth2Api` | `agenda` |

## Sécurité

Le dépôt est privé. Aucun secret en clair n'est versionné : les credentials OAuth
vivent dans le coffre n8n et n'apparaissent que comme des références (`id` + `name`).

Le `.gitignore` exclut `.n8ncli-global.json`, qui contient des jetons d'accès actifs.
