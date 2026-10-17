# GitHub setup and release steps

Suggested repository name: rom-travel-planner
Suggested About description: Offline trip planning with fuel-cost comparisons, daily itineraries, printable briefs, and copyable AI planning prompts.
Suggested topics: trip-planner, offline, travel-planning, python, javascript, personal-project

To rename: repository → Settings → Repository name → Rename.
To edit description/website/topics: Code page → gear beside About → Save changes.
The README contains the AI-assisted development sentence; keep About focused on purpose.

The owner reports the repository is public and the release draft has been created.
Update the source and download assets together before publishing the preview.

1. Put the approved source into your local repository clone, retaining its .git folder.
2. Review changes in GitHub Desktop; exclude Data, backups, exports, dependencies and dist.
3. Commit and push. Review the first commit and its author email before pushing.
4. On GitHub choose Releases → Draft a new release. Create tag v0.1.10 on that commit.
5. Title: RōM v0.1.10 — public preview. Paste RELEASE-NOTES.md and mark as prerelease.
6. Attach the checked app and Update ZIPs plus SHA256SUMS.txt. The repository ZIP is
   optional; the committed source is already available. Save as draft for final review.
7. Confirm the release assets match the final source commit, then publish as a pre-release.
   Record verification limits honestly; public preview does not imply every environment is tested.

GitHub references:
- https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository
- https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics
- https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository

If the repository later contains earlier commits, a normal source ZIP does not
include history. Review the actual history before changing visibility. MIT is
already adopted in LICENSE; do not include a separate proposed-license file.
