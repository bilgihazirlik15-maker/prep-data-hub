# Prep Data Hub

A static, responsive dashboard for an English Preparatory Program. The first report visualizes pass–fail rates with instant filtering by every source-data dimension.

## Run locally

Open `index.html` directly, or serve the folder with any static web server.

## Publish on GitHub Pages

Push the repository to GitHub, then enable **Settings → Pages → Deploy from a branch** and select the repository's main branch.

## Updating the data

The dashboard reads `data/pass-fail-data.js`. Keep the existing column names when replacing or extending the records:

- Academic Year
- Term
- Type of Students
- Level
- Number of Sts
- Pass Sts
- Fail Sts
- Pass Success Rate
