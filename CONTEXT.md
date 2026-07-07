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

## Profile Photo

The single circularly-displayed image that represents a Member, or the account holder's own avatar. It is framed by the uploader from any source image — typically by cropping one person out of a group photo — rather than requiring a ready-made headshot. The same concept is currently named differently in the two places it appears (Member `photo` versus account `avatar`); this is a known naming divergence, not two different concepts.

A Profile Photo is optional: it may have never been set, or it may have been removed after the fact. When absent, the Member or avatar falls back to its placeholder (initials). Removal discards the stored image — because only the framed crop is ever kept, removing a Profile Photo cannot be undone by the system; restoring one means framing a source image again.
_Avoid_: headshot, picture

## Maiden Name

The surname a Member had at birth, before it was changed — typically through marriage. It is optional and independent of the Member's current surname: a Member may have a Maiden Name, a current surname, both, or neither. It is descriptive identity, not a Relationship, and it carries no assumption about gender. When shown, it appears in parentheses after the Member's displayed name.
_Avoid_: née, birth name, last name

## Relationship

A typed connection between two Members in one Family Tree. The canonical Relationship types are Parent Relationship, Spouse Relationship, Divorced Relationship, and Sibling Relationship.

## Spouse Relationship

A mutual Relationship between two Members who are spouses. It is non-directional in the workspace even when a stored record happens to list one Member first. It is mutually exclusive with a Divorced Relationship for the same pair — a couple is recorded as one or the other, never both.

## Divorced Relationship

A mutual Relationship between two Members who were spouses and are now divorced. Like a Spouse Relationship it is non-directional, and it is mutually exclusive with a Spouse Relationship for the same pair: recording one for a pair replaces the other. It is drawn as a dotted line to distinguish it from a Spouse Relationship's solid line.

## Union

A shared parental pairing between two Members who have at least one child in common. A Union groups the shared-child connection and is distinct from the marital relationship by itself. The partners may be in a Spouse Relationship or a Divorced Relationship (or neither) — divorcing a couple does not dissolve their Union.

## Manual Tree Arrangement

The persisted set of node positions for one Family Tree's workspace. Editors can change it by dragging nodes so the tree reopens in the same shared arrangement for Collaborator Viewers and Guest Viewers.
_Avoid_: temporary layout, personal layout

## Drag Lock

A personal, device-local editor preference that disables dragging of Member nodes so that panning or scrolling — especially on touch devices — cannot accidentally move a Member and disturb the Manual Tree Arrangement. It is remembered per device and applied globally across every Family Tree the editor opens on that device, defaulting to on for touch/coarse-pointer devices and off otherwise. It only affects an editor's own interaction; it changes no shared tree data and grants no permissions. It is distinct from the editor/viewer permission boundary (which decides whether dragging is possible at all) and from the Manual Tree Arrangement (which is shared tree data). Collaborator Viewers and Guest Viewers never encounter it.
_Avoid_: shared lock, freeze layout, edit mode

## Collapsed Branch

A personal, view-only state in which the family hanging off a Branch Anchor is hidden from the tree workspace, so a viewer can focus on one part of a large Family Tree. Collapsing a Member hides that Member's ancestors and the rest of that ancestral family — including the in-laws who married into it — while keeping the Member and the Member's own descendants visible. Anyone with an independent connection to the rest of the tree stays visible even if they belong to the collapsed family. Like Drag Lock it is remembered per device, applies only to the viewer's own workspace, changes no shared tree data, and is never seen by other Collaborators or Guest Viewers. It is distinct from the Manual Tree Arrangement (shared tree data) and never alters it.
_Avoid_: pruning, deleting a branch, shared collapse, hiding people

## Branch Anchor

The Member from whom a Collapsed Branch is collapsed. The anchor and the anchor's own descendants stay visible while the anchor's ancestral family is hidden. A Member with no ancestors cannot be a Branch Anchor, since there would be nothing to hide.

## Hidden Relatives Badge

The indicator shown on a Branch Anchor announcing how many relatives the Collapsed Branch is currently hiding. Selecting it expands the branch and restores the hidden Members to view.
_Avoid_: counter, collapse pill

## Member Details Panel

A tree-workspace panel that shows the currently selected member's profile details, relationships, and permitted actions. Its presentation can vary by viewport without changing what it represents.
_Avoid_: member sidebar, side panel

## GEDCOM Export

The act, and resulting file, of taking a Family Tree out as a standard GEDCOM 5.5.1 file containing its Members, Relationships, dates, and bios. Available to any authenticated member of the tree; the export is full and unredacted.

## GEDCOM Import

The act of creating a new Family Tree from an uploaded GEDCOM file. Always produces a brand-new tree owned by the importer rather than merging into an existing one. Duplicate-free means individuals are de-duplicated within the file by their GEDCOM identifier.

## Import Report

The post-import summary shown to the user describing what was brought in (people, relationships) and what was skipped or dropped (unsupported places, events, sources, notes, dropped date ranges, inferred-living members). It is the honesty mechanism behind a lossy import.

## Issue Report

A report a signed-in User submits when something in the app isn't working, so the operator gains insight into problems that would otherwise go unseen. It pairs the User's own description of what went wrong with context captured automatically about where and under what conditions it happened — who reported it, the page they were on, the tree in view if any, their interface language, their browser, and which released version of the app they were running. An Issue Report belongs to the User who filed it and does not outlive that User's account. It is operator-facing support intake, distinct from a developer's bug tracker.
_Avoid_: ticket, bug, feedback, GitHub issue

## Family Picture

An AI-generated group portrait that places selected Members of one Family Tree together in a single image, produced from those Members' Profile Photos. Only Members who have a Profile Photo can appear in a Family Picture, since each depicted Member needs a reference face; a Member without a Profile Photo is not selectable. Living Members who are minors are also excluded: a Member is ineligible when they are living and either their recorded birth year makes them under 18 or their age cannot be confirmed because no birth year is recorded. It is a new artifact distinct from a Profile Photo: a Profile Photo represents one Member and is framed by a human from a source image, whereas a Family Picture is synthesized by a model to depict several Members together in a scene. A Family Picture may be refined through successive tweaks, each of which re-generates the image. It is a private artifact owned by the User who generated it, scoped to the source Family Tree but not part of that tree's shared data — other Collaborators and Guest Viewers do not see it. Any authenticated member of a tree (viewer, editor, or owner) may generate one; Guest Viewers cannot. A Family Picture is a self-contained snapshot: once generated it persists unchanged even if a depicted Member is edited or deleted, that Member's Profile Photo is changed, or the source Family Tree is deleted. It is destroyed only when the owning User is deleted.
_Avoid_: family photo, group photo, collage

## Generation

A single billed call to the image model that produces or refines a Family Picture. The initial creation is one Generation and every subsequent tweak is another Generation. It is the unit that is metered and capped, not the finished Family Picture — one Family Picture may cost many Generations. Each Generation produces one Family Picture Version.

## Family Picture Version

One image in a Family Picture's ordered history, produced by a single Generation. The first Generation produces the first Version; each tweak produces a new Version by refining a prior one. Every Version is retained so the User can browse and revert to an earlier one; the Version shown by default is the most recent unless the User selects an earlier one.

## Generation Allowance

The per-User, monthly cap on the number of Generations a User may consume. It exists to bound spend on an otherwise free feature and is the lever later monetization (subscription tier or purchased credits) will adjust.

## Example Dialogue

**Developer**: A Collaborator Viewer opened the Family Tree through the app and said the branches still overlap. Will they see the Manual Tree Arrangement an editor saved yesterday?

**Domain Expert**: Yes. The saved arrangement is part of the Family Tree workspace, so Collaborator Viewers and Guest Viewers both see it.

**Developer**: And if the arrangement gets messy after a few edits?

**Domain Expert**: An editor can drag the nodes back into a clearer arrangement; the new positions are saved and become what everyone sees.
