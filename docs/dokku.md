# docs/dokku.md

This page is not intended as full documentation of dokku setup; for that, please see: 

* <https://ucsb-cs156.github.io/topics/dokku/>

Instead, this is a quick guide to setting up a `proj-dining` 
instance on dokku that assumes you are already familiar with the basic operation of dokku, and just need a "cheat sheet" to 
get up and running quickly.

Throughout, we use `dining` as the appname.  Substitute any other appropriate name, e.g. `dining-qa`, `dining-dev-cgaucho`, `dining-pr235` as needed.

The lines in the instructions where you need to modify something are marked with the comment: `# modify this`

* For the values of `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` see [docs/oauth.md](https://github.com/ucsb-cs156/proj-dining/blob/main/docs/oauth.md)
* For the value of `UCSB_API_KEY` see: [UCSB Developer API overview](https://ucsb-cs156.github.io/topics/apis/apis_ucsb_developer_api.html)
* Set `SOURCE_REPO` to be the url of your teams' repo (i.e. replace the team name in the example below) 

The other line you can copy/paste as is, except for changing `dining` to whatever your app name will be (e.g. `dining-qa`, `dining-dev-cgaucho`, `dining-pr235`).

### Identify this app to any UCSB API proxy in front of it (e.g. `dining-caching-proxy`)

**Run this once per app**, so that `APP_NAME` and `APP_HOSTNAME` are available inside the container.
The app uses these to build an `X-Requesting-App` header (e.g. `dining-qa.dokku-00.cs.ucsb.edu`) that
it sends on every request to `app.ucsb.api.host`. If that host is a caching proxy sitting in front of
the real UCSB API, this lets it track traffic by app name instead of IP address — IP addresses aren't
reliable for this when both apps live on the same Dokku host, since they then share Docker's internal
bridge network and the caller's IP is just an internal address that means nothing outside the host.
Skipping this step doesn't break anything; the app still works, it just won't self-identify.

Run these in your shell on the dokku server (after you `ssh` in). Set `APP` to your app name once;
it's then used both as the app to configure and as the value of `APP_NAME`, so the two can't get out
of sync through a copy/paste slip. `$(hostname -f)` is filled in by your shell with the dokku server's
name before the command runs.

```
APP=dining
dokku config:set $APP APP_NAME=$APP APP_HOSTNAME=$(hostname -f)
```

`config:set` restarts the app, so no rebuild is needed.

Confirm it worked:

```
dokku enter $APP web env | grep -E 'APP_NAME|APP_HOSTNAME'
```

The output should show your app's name and dokku server, for example:

```
APP_HOSTNAME=dokku-00.cs.ucsb.edu
APP_NAME=dining
```

If either line shows `$(...)` text instead, the app was set up with the older instructions below.

#### Apps set up with the older instructions

An earlier version of this section used `dokku docker-options:add` with `$(...)` commands, expecting
dokku to evaluate them when the container starts. Our dokku servers don't evaluate them: the container
gets the literal command text, so the `X-Requesting-App` header contains that text instead of the app
name. To fix an app set up that way, remove the old options, then run the `config:set` command above:

```
APP=dining
dokku docker-options:remove $APP deploy,run '--env=APP_NAME=$(echo $DOCKER_RUN_LABEL_ARGS | sed -n "s/.*--label=com\.dokku\.app-name=\([^ ]*\).*/\1/p")'
dokku docker-options:remove $APP deploy,run '--env=APP_HOSTNAME=$(hostname -f)'
dokku docker-options:report $APP
```

The report should no longer list any `--env=APP_NAME` or `--env=APP_HOSTNAME` options.

### Create `dining`

```
# Create app
dokku apps:create dining

# Create and link postgres database
dokku postgres:create dining-db
dokku postgres:link dining-db dining --no-restart

# Modify dokku settings
dokku git:set dining keep-git-dir true

# Set config vars
dokku config:set --no-restart dining PRODUCTION=true
dokku config:set --no-restart dining GOOGLE_CLIENT_ID=get-value-from-google-developer-console # modify this
dokku config:set --no-restart dining GOOGLE_CLIENT_SECRET=get-value-from-google-developer-console # modify this
dokku config:set --no-restart dining UCSB_API_KEY=get-from-developer.ucsb.edu  # modify this

# Set SOURCE_REPO to your repo (modify the url)
# This is for the link in the footer, and for the link to currently deployed branch in /api/systemInfo
dokku config:set --no-restart dining SOURCE_REPO=https://github.com/ucsb-cs156-f25/proj-dining-f25-xx 

# Set ADMIN_EMAILS to staff emails and team emails
dokku config:set --no-restart dining ADMIN_EMAILS=list-of-admin-emails # modify this

# git sync for first deploy (http)
dokku git:sync dining https://github.com/ucsb-cs156-f25/proj-dining-f25-xx main  # modify this 
dokku ps:rebuild dining

# Enable https
dokku letsencrypt:set dining email yourEmail@ucsb.edu # modify email
dokku letsencrypt:enable dining
```

### Create `dining-qa`

```
# Create app
dokku apps:create dining-qa

# Create and link postgres database
dokku postgres:create dining-qa-db
dokku postgres:link dining-qa-db dining-qa --no-restart

# Modify dokku settings
dokku git:set dining-qa keep-git-dir true

# Set config vars
dokku config:set --no-restart dining-qa PRODUCTION=true
dokku config:set --no-restart dining-qa GOOGLE_CLIENT_ID=get-value-from-google-developer-console # modify this
dokku config:set --no-restart dining-qa GOOGLE_CLIENT_SECRET=get-value-from-google-developer-console # modify this
dokku config:set --no-restart dining-qa UCSB_API_KEY=get-from-developer.ucsb.edu  # modify this

# Set SOURCE_REPO to your repo (modify the url)
# This is for the link in the footer, and for the link to currently deployed branch in /api/systemInfo
dokku config:set --no-restart dining-qa SOURCE_REPO=https://github.com/ucsb-cs156-f25/proj-dining-f25-xx 

# Set ADMIN_EMAILS to staff emails and team emails
dokku config:set --no-restart dining-qa ADMIN_EMAILS=list-of-admin-emails # modify this

# git sync for first deploy (http)
dokku git:sync dining-qa https://github.com/ucsb-cs156-f25/proj-dining-f25-xx main  # modify this 
dokku ps:rebuild dining-qa

# Enable https
dokku letsencrypt:set dining-qa email yourEmail@ucsb.edu # modify email
dokku letsencrypt:enable dining-qa
```
