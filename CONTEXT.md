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

## User Settings

An authenticated account-management area where a User manages Account, Language, and Security preferences.

## Settings Section

A routable subsection of User Settings with a dedicated purpose and URL.

## Account Section

The Settings Section where a User manages profile identity details such as display name, avatar, and email-change requests.

## Preferred Locale

The persisted language preference used to localize authenticated user experiences in English, Spanish, or Russian.

## Language Section

The Settings Section where a User changes Preferred Locale between English, Spanish, and Russian.

## Language Picker

A three-option control that lets a visitor or User switch the active interface locale between English, Spanish, and Russian. Its options are labeled with the languages' self-names: English, Español, and Русский.
_Avoid_: Language Toggle

## Security Section

The Settings Section for credential and account-lifecycle actions, including password changes and account deletion.

## Pending Email Change

A state where a User has requested a new email address but the current email remains active until the new address is verified.

## Post-Auth Redirect

A validated in-product destination preserved across sign-in, sign-up, and verification flows when a User began from a specific route.

## Verification Welcome

A post-verification confirmation shown when a newly verified User lands on the default dashboard path. It confirms success and may invite the User to create a first Family Tree.

## Danger Zone

A visually isolated area in the Security Section that contains irreversible account-lifecycle actions.

## Account Deletion Confirmation

A dual-confirmation gate requiring current password and the phrase DELETE before account deletion can proceed.

## Account Deletion Boundary

The rule that deleting a User removes owned-tree data and collaborator access while preserving trees owned by other Users.

## Tree Menu

A tree-scoped navigation and action entry point for the tree workspace. It exposes actions such as collaboration, sharing, and editing without implying the tree is owned by the current viewer.
_Avoid_: My Tree, tree sidebar

## Member Details Panel

A tree-workspace panel that shows the currently selected member's profile details, relationships, and permitted actions. Its presentation can vary by viewport without changing what it represents.
_Avoid_: member sidebar, side panel
