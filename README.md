# Workflows n8n

Versionnement des workflows n8n au format **Workflow SDK** (`*.workflow.ts`), le format natif de `n8ncli`.

## Contenu

| Fichier | Description |
|---|---|
| `workflows/workflow-edt.workflow.ts` | Hub d'organisation hebdomadaire (11 nœuds) |

## Format et validation

Le fichier n'a **pas** de ligne `import`. C'est délibéré : `n8ncli` refuse les déclarations
d'import dans les fichiers versionnés. L'import est ajouté à la volée au moment d'appeler
l'API MCP.

```powershell
n8ncli validate workflows\workflow-edt.workflow.ts
n8ncli lint workflows\workflow-edt.workflow.ts
```

## Standards non respectés (assumés)

`n8ncli lint` signale des avertissements volontairement acceptés :

- **Noms et descriptions en anglais** — le workflow est en français, on assume.
- **Title Case** — les noms de nœuds suivent la casse du français, pas `Title Case` anglais.
- **Nom du dossier** `mes-workflows-n8n` — minuscules acceptées pour correspondre au nom du dépôt GitHub.

Ces règles se règlent dans `n8n-standards.json` si tu veux les assouplir.

## Importer dans n8n

Depuis l'interface : le SDK n'est pas importable tel quel. Utiliser la CLI :

```powershell
n8ncli push --all
```

## Identifiants référencés

Les credentials ne sont jamais exportés : ils sont référencés par nom via `newCredential()`.
Il faut les recréer ou les renommer à l'import.

| Nœud | Type de credential | Nom attendu dans l'instance |
|---|---|---|
| Gmail Trigger | `gmailOAuth2` | `sarah gmail` |
| Creer la page | `notionOAuth2Api` | `Notion account` |
| Creer l evenement | `googleCalendarOAuth2Api` | `agenda` |

## Sécurité

Le dépôt est privé. Aucun secret en clair n'est versionné.

Le `.gitignore` exclut `.n8ncli-global.json` et `.n8ncli/`, qui contiennent des jetons
d'accès actifs.

