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

## Family Tree

A shared collection of Members and Relationships owned by one User and optionally accessed by Collaborators. It is the unit of ownership, sharing, and workspace arrangement.

## Member

A person represented within one Family Tree. Members participate in Relationships with other Members.

## Relationship

A typed connection between two Members in one Family Tree. The canonical Relationship types are Parent Relationship, Spouse Relationship, and Sibling Relationship.

## Spouse Relationship

A mutual Relationship between two Members who are spouses. It is non-directional in the workspace even when a stored record happens to list one Member first.

## Union

A shared parental pairing between two Members who have at least one child in common. A Union groups the shared-child connection and is distinct from a Spouse Relationship by itself.

## Manual Tree Arrangement

The persisted set of node positions for one Family Tree's workspace. Editors can change it by dragging nodes so the tree reopens in the same shared arrangement for Collaborator Viewers and Guest Viewers.
_Avoid_: temporary layout, personal layout

## Reset Layout

An editor action that discards the Manual Tree Arrangement and restores the automatic tree layout. It is the escape hatch when the shared arrangement has become less useful than the computed one.
_Avoid_: undo drag history, personal reset

## Member Details Panel

A tree-workspace panel that shows the currently selected member's profile details, relationships, and permitted actions. Its presentation can vary by viewport without changing what it represents.
_Avoid_: member sidebar, side panel

## GEDCOM Export

The act, and resulting file, of taking a Family Tree out as a standard GEDCOM 5.5.1 file containing its Members, Relationships, dates, and bios. Available to any authenticated member of the tree; the export is full and unredacted.

## GEDCOM Import

The act of creating a new Family Tree from an uploaded GEDCOM file. Always produces a brand-new tree owned by the importer rather than merging into an existing one. Duplicate-free means individuals are de-duplicated within the file by their GEDCOM identifier.

## Import Report

The post-import summary shown to the user describing what was brought in (people, relationships) and what was skipped or dropped (unsupported places, events, sources, notes, dropped date ranges, inferred-living members). It is the honesty mechanism behind a lossy import.

## Example Dialogue

**Developer**: A Collaborator Viewer opened the Family Tree through the app and said the branches still overlap. Will they see the Manual Tree Arrangement an editor saved yesterday?

**Domain Expert**: Yes. The saved arrangement is part of the Family Tree workspace, so Collaborator Viewers and Guest Viewers both see it.

**Developer**: And if the arrangement gets messy after a few edits?

**Domain Expert**: An editor can use Reset Layout to discard the Manual Tree Arrangement and return to the automatic layout.
