# PYMING customizations

This branch adds a `colaborador` multi-user role. Collaborators can chat in assigned workspaces and use the chat upload-and-embed flow there. They cannot open the Manage Workspace document library, browse instance-wide local files, create workspaces, purge global documents, or access system, user, or workspace settings.

## Maintained differences

- Backend role validation and role-selection hierarchy include `colaborador`.
- Assigned-workspace upload, link processing, and embedding routes explicitly allow collaborators and retain workspace membership middleware. Global document, folder, watched-document, and purge operations remain manager/admin-only.
- Frontend role controls expose the role while hiding manager/admin navigation, settings, and the Manage Workspace document-library button.
- PYMING's amd64 GHCR image is tested on pull requests and published only by trusted branch/tag pushes.
- A weekly/manual workflow proposes merging the latest stable upstream release into `pyming`.

Authorization remains server-enforced; frontend visibility is not a security boundary. Review this inventory after every upstream merge.
