# Family Tree Domain Glossary

## Invitation

A pending, email-addressed request to access a specific tree with a chosen role. Invitations are time-limited, cancellable, and become consumed when accepted.

## Collaborator

An accepted tree participant linked to a user account with role `editor` or `viewer`. Collaborators can access the tree according to the role matrix.

## Collaborator Viewer

An authenticated collaborator role with read-only access to a shared tree.

## Share Token

A random, URL-safe identifier that points to one tree's public guest view.

## Public Share Link

A URL in the format `/t/{share_token}` that grants unauthenticated read-only access to a tree when sharing is enabled.

## Guest Viewer

An unauthenticated person who accesses a tree through a Public Share Link.

## Link Disabled

A public-link state where guest access is intentionally unavailable because sharing is off or the link token has been rotated.

## Share Link Regeneration

The act of issuing a new Share Token for a tree and invalidating previously issued public links.
