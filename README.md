# To-Do List App with Jenkins CI/CD and Docker

A simple, responsive To-Do List web application built with **Node.js + Express**, packaged with **Docker**, and deployed automatically by a **Jenkins** pipeline that pulls the code from **GitHub**. It runs on your own machine or on an **AWS EC2** server.

This project was built for a DevOps assignment, so the app itself is intentionally small. The focus is the full CI/CD flow:

```
GitHub  →  Jenkins  →  npm install  →  npm test  →  docker build  →  docker run  →  health check
```

---

## Table of contents

1. [Features](#features)
2. [Technologies used](#technologies-used)
3. [Project structure](#project-structure)
4. [API reference](#api-reference)
5. [Run locally (without Docker)](#run-locally-without-docker)
6. [Run with Docker](#run-with-docker)
7. [Push the project to GitHub](#push-the-project-to-github)
8. [Jenkins installation requirements](#jenkins-installation-requirements)
9. [Jenkins configuration](#jenkins-configuration)
10. [Create the Jenkins pipeline](#create-the-jenkins-pipeline)
11. [Required Jenkins credentials](#required-jenkins-credentials)
12. [How the Jenkins pipeline works](#how-the-jenkins-pipeline-works)
13. [Deploy on AWS EC2 (step by step)](#deploy-on-aws-ec2-step-by-step)
14. [Access the deployed application](#access-the-deployed-application)
15. [Environment variables](#environment-variables)
16. [Common errors and solutions](#common-errors-and-solutions)

---

## Features

- **Add** a task (Enter key or the *Add task* button)
- **Mark** a task as completed or pending (checkbox)
- **Edit** a task (pencil icon or double-click the text; Enter saves, Esc cancels)
- **Delete** a task (trash icon)
- **Filter** tasks: All / Pending / Completed
- **Task counter**: "N tasks left" headline, a progress bar, and a count on each filter
- **Clear completed** tasks in one click
- **Responsive UI** that works on phones, tablets and desktops
- **Health check** endpoint (`/health`) used by Docker and Jenkins
- **Version label** in the footer that shows the Jenkins build number, so you can see each new deployment go live

Tasks are stored **in memory** on the server. They are shared by everyone using the same server and are reset whenever the app/container restarts. This is intentional: the project demonstrates CI/CD, not databases.

---

## Technologies used

| Area | Technology |
|------|------------|
| Front end | HTML5, CSS3, vanilla JavaScript (Fetch API) |
| Back end | Node.js 20, Express 4 |
| Testing | Node.js built-in test runner (`node:test`), no extra libraries |
| Containerization | Docker (`node:20-alpine` base image) |
| CI/CD | Jenkins declarative pipeline (`Jenkinsfile`) |
| Source control | Git and GitHub |
| Cloud | AWS EC2 (Ubuntu) |

---

## Project structure

```
todo-jenkins/
├── public/              # Front end served by Express
│   ├── index.html       # Page markup
│   ├── style.css        # Styles (responsive)
│   └── script.js        # UI logic, calls the REST API
├── tests/
│   └── app.test.js      # Automated tests run by "npm test"
├── server.js            # Express server + in-memory REST API
├── package.json         # Project info, scripts, dependencies
├── package-lock.json    # Exact dependency versions (used by npm ci)
├── Dockerfile           # How to build the Docker image
├── Jenkinsfile          # The CI/CD pipeline definition
├── .dockerignore        # Files excluded from the Docker image
├── .gitignore           # Files excluded from Git
└── README.md            # This file
```

---

## API reference

| Method | URL | Body | Description |
|--------|-----|------|-------------|
| GET | `/health` | none | Returns `{"status":"ok","version":"..."}` |
| GET | `/api/tasks?filter=all\|pending\|completed` | none | List tasks plus counts |
| POST | `/api/tasks` | `{"text":"Buy milk"}` | Add a task |
| PUT | `/api/tasks/:id` | `{"text":"..."}` and/or `{"completed":true}` | Edit or complete a task |
| DELETE | `/api/tasks/:id` | none | Delete a task |
| DELETE | `/api/tasks/completed` | none | Clear all completed tasks |

---

## Run locally (without Docker)

**Requirement:** Node.js 18 or newer (Node 20 LTS recommended). Check with `node --version`.

```bash
cd todo-jenkins
npm install          # install dependencies
npm test             # run the automated tests (should show "pass 12, fail 0")
npm start            # start the server
```

Open **http://localhost:3000** in your browser.

To use a different port:

```bash
# Linux / macOS
PORT=8081 npm start

# Windows PowerShell
$env:PORT=8081; npm start
```

Stop the server with `Ctrl + C`.

---

## Run with Docker

**Requirement:** Docker installed and running (`docker --version`).

```bash
cd todo-jenkins

# 1. Build the image
docker build -t todo-jenkins:latest .

# 2. Run a container (host port 3000 → container port 3000)
docker run -d --name todo-app -p 3000:3000 todo-jenkins:latest

# 3. Check it is running
docker ps
curl http://localhost:3000/health
```

Open **http://localhost:3000**.

Useful commands:

```bash
docker logs todo-app               # view app logs
docker stop todo-app               # stop the container
docker rm todo-app                 # remove the container
docker run -d --name todo-app -p 8080:3000 todo-jenkins:latest   # use host port 8080 instead
```

After about 10–15 seconds `docker ps` shows the container as `(healthy)`, thanks to the `HEALTHCHECK` in the Dockerfile.

---

## Push the project to GitHub

1. Sign in to GitHub and click **New repository**.
2. Name it `todo-jenkins`, choose **Public** (simplest for Jenkins) or Private, and **do not** tick "Add a README" (this project already has one). Click **Create repository**.
3. In a terminal inside the project folder:

```bash
git init
git add .
git commit -m "Initial commit: To-Do app with Docker and Jenkins"
git branch -M main
git remote add origin https://github.com/<your-username>/todo-jenkins.git
git push -u origin main
```

When Git asks for a password, use a **Personal Access Token**, not your GitHub password (GitHub → Settings → Developer settings → Personal access tokens → *Tokens (classic)* → Generate, with the `repo` scope).

`node_modules/` is excluded by `.gitignore`, so it is never pushed. Jenkins reinstalls dependencies itself.

---

## Jenkins installation requirements

The machine that runs Jenkins (your laptop or the EC2 server) needs:

| Software | Why | Check with |
|----------|-----|------------|
| Java 21 (OpenJDK) | Jenkins runs on Java | `java -version` |
| Jenkins LTS | The CI/CD server | open `http://<host>:8080` |
| Git | Checkout stage | `git --version` |
| Node.js 18+ and npm | Install Dependencies and Test stages | `node -v`, `npm -v` |
| Docker | Build and Deploy stages | `docker --version` |
| curl | Verify stage | `curl --version` |

Hardware: at least **2 GB RAM** (Jenkins + Docker build). On AWS use **t3.small** or larger; `t2.micro`/`t3.micro` (1 GB) often freezes during builds.

The **`jenkins` user must be allowed to run Docker**:

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

> **Running Jenkins itself inside a Docker container?** It is easier for this assignment to install Jenkins directly on the host (as shown in the EC2 section). A Jenkins container does not have Node.js or the Docker CLI by default, and `localhost` in the Verify stage would point to the Jenkins container instead of the host.

---

## Jenkins configuration

After installing Jenkins (steps are in the [EC2 section](#deploy-on-aws-ec2-step-by-step)):

1. Open `http://<server-ip>:8080`.
2. Unlock Jenkins with the initial password:
   ```bash
   sudo cat /var/lib/jenkins/secrets/initialAdminPassword
   ```
3. Choose **Install suggested plugins**. This includes everything the pipeline needs (**Pipeline** and **Git**). No other plugins are required.
4. Create your admin user and keep the default Jenkins URL.

That's all the configuration the pipeline needs. Node.js is used directly from the server's PATH, so you do **not** need the NodeJS plugin.

---

## Create the Jenkins pipeline

1. On the Jenkins dashboard click **New Item**.
2. Enter the name `todo-jenkins`, select **Pipeline**, click **OK**.
3. (Optional) Under **General**, tick **GitHub project** and paste your repository URL.
4. (Optional, for automatic builds) Under **Triggers**, tick **Poll SCM** and enter `H/5 * * * *` (Jenkins checks GitHub every 5 minutes and builds if there are new commits). See the webhook tip below for instant builds.
5. Scroll to **Pipeline**:
   - **Definition:** `Pipeline script from SCM`
   - **SCM:** `Git`
   - **Repository URL:** `https://github.com/<your-username>/todo-jenkins.git`
   - **Credentials:** `- none -` for a public repo (see next section for private repos)
   - **Branch Specifier:** `*/main`
   - **Script Path:** `Jenkinsfile`
6. Click **Save**, then **Build Now**.
7. Click the build number → **Console Output** to watch it run. Open **Pipeline Overview** (or **Stages**) to see each stage turn green.

**Optional: GitHub webhook for instant builds**
1. In the job, under **Triggers**, tick **GitHub hook trigger for GITScm polling**.
2. In GitHub → your repo → **Settings → Webhooks → Add webhook**:
   - Payload URL: `http://<server-ip>:8080/github-webhook/` (the trailing slash matters)
   - Content type: `application/json`
   - Events: *Just the push event*
3. Every `git push` now starts a build automatically.

---

## Required Jenkins credentials

| Situation | Credentials needed |
|-----------|--------------------|
| **Public** GitHub repository | **None.** |
| **Private** GitHub repository | A GitHub username + Personal Access Token |
| Docker | **None.** The image is built and run on the same machine, so no Docker Hub login is needed |

To add GitHub credentials for a private repo:

1. **Manage Jenkins → Credentials → System → Global credentials → Add Credentials**
2. **Kind:** Username with password
3. **Username:** your GitHub username
4. **Password:** your GitHub Personal Access Token (`repo` scope)
5. **ID:** `github-creds`
6. Save, then select `github-creds` in the job's **Credentials** dropdown.

---

## How the Jenkins pipeline works

The `Jenkinsfile` defines six stages. If any stage fails, the pipeline stops and the currently running app is left untouched (a failed test never reaches deployment).

| # | Stage | What it does |
|---|-------|--------------|
| 1 | **Checkout** | `checkout scm` pulls the latest code from GitHub (the repo/branch configured in the job). |
| 2 | **Install Dependencies** | Prints Node/npm versions and runs `npm install`. |
| 3 | **Test** | Runs `npm test`: 12 automated tests that start the server, request the main page and static files, and exercise add, edit, complete, delete, filter, counts and clear-completed. |
| 4 | **Build Docker Image** | `docker build` creates `todo-jenkins:<build-number>` and also tags it `todo-jenkins:latest`. |
| 5 | **Deploy** | Stops and removes the old `todo-app` container if it exists, then starts the new one with `docker run -d -p 3000:3000 --restart unless-stopped`. |
| 6 | **Verify** | Calls `http://localhost:3000/health` up to 10 times (3 s apart). Passes when the app answers; otherwise prints the container logs and fails the build. |

After every build, `docker image prune -f` removes dangling images to save disk space.

Settings at the top of the `Jenkinsfile` you can change:

```groovy
APP_NAME       = 'todo-app'      // container name
IMAGE_NAME     = 'todo-jenkins'  // image name
HOST_PORT      = '3000'          // port opened on the server
CONTAINER_PORT = '3000'          // port inside the container
APP_VERSION    = "1.0.${env.BUILD_NUMBER}"
```

**Demo idea for your assignment:** change some text in `public/index.html`, push to GitHub, build in Jenkins, and refresh the browser. The footer version changes from `v1.0.4` to `v1.0.5`, which proves the new build was deployed.

---

## Deploy on AWS EC2 (step by step)

In this setup, Jenkins, Docker and the app all run on **one EC2 instance**.

### 1. Launch the instance

1. AWS Console → **EC2 → Launch instance**.
2. **Name:** `todo-jenkins-server`
3. **AMI:** Ubuntu Server 24.04 LTS (22.04 also works)
4. **Instance type:** `t3.small` (2 GB RAM) or larger
5. **Key pair:** create or choose one and download the `.pem` file
6. **Network settings → Edit → Security group inbound rules:**

| Type | Port | Source | Purpose |
|------|------|--------|---------|
| SSH | 22 | My IP | Connect to the server |
| Custom TCP | 8080 | My IP (or Anywhere for a webhook) | Jenkins web UI |
| Custom TCP | 3000 | Anywhere (0.0.0.0/0) | The To-Do app |

7. **Storage:** 15–20 GB.
8. Click **Launch instance**, then copy its **Public IPv4 address**.

### 2. Connect via SSH

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### 3. Install Git, curl and Docker

```bash
sudo apt update
sudo apt install -y git curl docker.io
sudo systemctl enable --now docker
sudo usermod -aG docker ubuntu     # lets the ubuntu user run docker (log out and back in)
docker --version
```

### 4. Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

### 5. Install Java 21 and Jenkins (LTS)

Install Java **first**, then Jenkins:

```bash
sudo apt install -y fontconfig openjdk-21-jre
java -version

sudo mkdir -p /etc/apt/keyrings
sudo wget -O /etc/apt/keyrings/jenkins-keyring.asc \
  https://pkg.jenkins.io/debian-stable/jenkins.io-2026.key
echo "deb [signed-by=/etc/apt/keyrings/jenkins-keyring.asc] https://pkg.jenkins.io/debian-stable binary/" | \
  sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null

sudo apt update
sudo apt install -y jenkins
sudo systemctl enable --now jenkins
sudo systemctl status jenkins      # should say "active (running)"; press q to exit
```

If `apt update` shows a `NO_PUBKEY` error, the Jenkins signing key has changed again; copy the current commands from https://www.jenkins.io/doc/book/installing/linux/.

### 6. Allow Jenkins to use Docker

```bash
sudo usermod -aG docker jenkins
sudo systemctl restart jenkins
```

### 7. Set up Jenkins and run the pipeline

1. Open `http://<EC2-PUBLIC-IP>:8080`.
2. Follow [Jenkins configuration](#jenkins-configuration) and [Create the Jenkins pipeline](#create-the-jenkins-pipeline).
3. Click **Build Now**. All six stages should turn green.

### Optional: deploy on EC2 with Docker only (no Jenkins)

```bash
git clone https://github.com/<your-username>/todo-jenkins.git
cd todo-jenkins
docker build -t todo-jenkins:latest .
docker run -d --name todo-app --restart unless-stopped -p 3000:3000 todo-jenkins:latest
```

---

## Access the deployed application

| What | URL |
|------|-----|
| To-Do app | `http://<EC2-PUBLIC-IP>:3000` |
| Health check | `http://<EC2-PUBLIC-IP>:3000/health` |
| Jenkins | `http://<EC2-PUBLIC-IP>:8080` |
| Local Docker | `http://localhost:3000` |

Use `http://`, not `https://`. The public IP changes if you **stop and start** the instance (a reboot keeps it). Attach an **Elastic IP** if you need a fixed address, and remember to update the GitHub webhook URL if the IP changes.

To save AWS credit, **stop** the instance when you are not using it.

---

## Environment variables

| Variable | Default | Used by | Description |
|----------|---------|---------|-------------|
| `PORT` | `3000` | `server.js` | Port the Express server listens on |
| `APP_VERSION` | version in `package.json` | `server.js` | Shown in `/health` and the page footer; Jenkins sets it to `1.0.<build number>` |
| `NODE_ENV` | `production` in Docker | Express | Enables production optimizations |

Example: `docker run -d -p 8080:8080 -e PORT=8080 todo-jenkins:latest`

---

## Common errors and solutions

**`permission denied while trying to connect to the Docker daemon socket`** (in Jenkins)
The `jenkins` user is not in the `docker` group. Run `sudo usermod -aG docker jenkins && sudo systemctl restart jenkins`, then rebuild.

**`npm: not found` or `node: not found`** (Install Dependencies stage)
Node.js is not installed on the Jenkins machine or not on its PATH. Install Node.js 20 (step 4 of the EC2 guide) and check with `sudo -u jenkins node -v`.

**`docker: not found`**
Docker is not installed on the Jenkins machine. Run `sudo apt install -y docker.io`, then add `jenkins` to the `docker` group.

**`Bind for 0.0.0.0:3000 failed: port is already allocated`**
Something else is using port 3000, often an app you started manually with `npm start` or a container with a different name. Find it with `sudo lsof -i :3000` or `docker ps`, stop it, or change `HOST_PORT` in the `Jenkinsfile`.

**Jenkins page or the app does not open in the browser**
Check the EC2 **security group** allows ports 8080 and 3000, you used `http://` (not `https://`), and you have the current public IP. On the server, test with `curl localhost:3000/health`.

**`Couldn't find any revision to build`** (Checkout stage)
The branch name is wrong. GitHub's default branch is `main`, so set Branch Specifier to `*/main` (not `*/master`).

**`Authentication failed` / `Repository not found`** (Checkout stage)
The repository is private or the URL has a typo. Make it public or add GitHub credentials as described [above](#required-jenkins-credentials).

**`Cannot find module 'express'`** when running locally
Run `npm install` first.

**Tests fail with `fetch is not defined` or `node:test` errors**
Your Node.js version is too old. Upgrade to Node 18+ (Node 20 recommended).

**Jenkins or builds are extremely slow or the instance freezes**
The instance has too little RAM. Use `t3.small` or bigger, or add swap:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
```

**`jenkins: failed to find a valid Java installation`**
Java was installed after Jenkins or is the wrong version. Run `sudo apt install -y openjdk-21-jre` and `sudo systemctl restart jenkins`.

**Verify stage fails with `Application did not respond`**
Read the container logs printed in the console output (or run `docker logs todo-app`). Usually the port mapping is wrong or the container crashed on startup.

**My tasks disappeared**
Expected: tasks live in memory, so every redeploy or restart starts with an empty list.

**Out of disk space after many builds**
Clean up unused images: `docker image prune -a -f` (removes all images not used by a running container).

---

## License

MIT. Free to use for learning and assignments.
