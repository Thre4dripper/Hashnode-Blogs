---
title: "Generate Apk using Github Actions"
seoTitle: "Automate APK Builds and GitHub Releases with GitHub Actions"
seoDescription: "Automate APK builds and GitHub Releases with GitHub Actions for a seamless Android development workflow."
datePublished: Thu Mar 20 2025 22:16:51 GMT+0000 (Coordinated Universal Time)
cuid: cm8hwvikr000t09jv989rglmo
slug: generate-apk-using-github-actions
cover: https://cdn.hashnode.com/res/hashnode/image/upload/v1742423593563/a5e6bccc-d25e-4fb8-ada0-97596e3d02fc.png
tags: android-app-development, github, automation, android, android-studio, android-apps, ci-cd, github-actions-1

---

# Overview

When developing Android apps, it's easy to overlook the fact that the APK installed via Android Studio is specific to your device. While Android Studio provides an option to manually generate an APK for distribution, sharing it with others can be cumbersome—especially for personal projects or portfolio apps that you want to showcase alongside your GitHub repository.

Web developers can conveniently share their hosted projects via a simple link in their README or sidebar. But for Android developers, the process of manually generating an APK, uploading it to GitHub Releases, and writing release notes every time you update your project can be tedious and time-consuming.

What if I told you this entire process could be automated? Imagine just pushing your code to GitHub, and everything else—APK generation, release creation, and release notes—happens automatically.

In this article, we’ll explore how to achieve this using **GitHub Actions**, a built-in automation tool within GitHub. No additional tools are required—just pure automation.

Let's get started! 🚀

# What is Github Actions?

GitHub Actions is a **CI/CD (Continuous Integration/Continuous Deployment) platform** that enables you to automate your software development workflows—right from your GitHub repository. With GitHub Actions, you can automate tasks such as building, testing, and deploying your code without relying on external CI/CD tools.

It provides **full-fledged virtual machines** where you can run virtually any automation script, making it highly flexible and easily integrable with various tools and services. Whether you need to build an APK, deploy a website, or run scheduled tasks, GitHub Actions allows you to streamline your workflow efficiently.

# Setting Up Your Workflow

Workflows are automation scripts that allow us to define and execute specific tasks automatically. In GitHub, these workflows are stored inside a special folder called `.github/workflows` at the root level of your repository.

Workflows are written in **YAML**, a widely used language for CI/CD pipelines. In this section, we’ll create a workflow file to automate the APK generation process.

## Creating the Workflow File

To get started, create a new file named `build.yml` inside the `.github/workflows` folder of your repository.

## Overview of the Workflow File

```yaml
# Name of the workflow
name: Build APK

# Triggers
on:
  push:
    branches:
      - main
  workflow_dispatch:

# Permissions for this workflow
permissions:
  contents: write
  pull-requests: write
  packages: write

# Task jobs
jobs:
  setup:
    name: Setup
    runs-on: ubuntu-latest
    steps:

  build:
    name: Build APK
    runs-on: ubuntu-latest
    needs: setup
    steps:

  create-release:
    name: Create Release
    runs-on: ubuntu-latest
    needs: [setup, build]
    steps:
```

This workflow is configured to run on two triggers:

* **Push to the** `main` branch
    
* **Manual trigger (**`workflow_dispatch`)
    

If you’re unfamiliar with these configurations, don’t worry! The key part to focus on is the `jobs` section. These jobs define the different tasks that will be executed on a virtual machine (in this case, `ubuntu-latest`). We will use artifacts to share the context of one job to the next one

Each job consists of **steps**, where we write Linux terminal commands to perform specific tasks.

## **Defining Task Jobs**

To automate the APK generation and release process, we’ll define three jobs:

### **1\. Setup**

* Generates required secret files inside the workflow (such as `google-services.json` for Firebase).
    

### **2\. Build**

* Compiles and builds the APK using Gradle.
    
* We use the **debug** version in this example, but you can configure it to generate a **release** version as well.
    

### **3\. Create Release**

* Generates release notes.
    
* Uploads the generated APK to **GitHub Releases** automatically.
    

By structuring our workflow this way, we ensure a smooth and automated process for generating, managing, and publishing APK files—without manual intervention! 🚀

# **Configuring Secrets for Secure Builds**

To keep sensitive information safe, GitHub provides a way to store secrets securely within your repository. These secrets can then be accessed within your workflows without exposing them in your code.

### **Adding Secrets to Your Repository**

1. **Navigate to your repository settings:**
    
    * Go to **Settings → Secrets and Variables → Actions**.
        
        ![](https://cdn.hashnode.com/res/hashnode/image/upload/v1742424215837/66a0ac95-030a-4caf-916a-bdc4b6fec75f.png align="center")
        
2. **Create a new secret:**
    
    * Under **Repository Secrets**, click **New repository secret**.
        
    * Enter a **name** for the secret (e.g., `GOOGLE_SERVICES_JSON`).
        
    * Paste the content of your secret (e.g., the entire `google-services.json` file) into the **Value** field.
        
    * Click **Add secret**.
        
3. **Repeat for other secrets:**
    
    * You can store API keys, authentication tokens, or any other sensitive data using the same process.
        
    * Give each secret a meaningful name, as we’ll refer to them later in the workflow.
        

### **Accessing Secrets in the Workflow**

Once secrets are stored, they can be accessed inside the workflow using the following syntax:

```yaml
${{ secrets.SECRET_NAME }}
```

For example, to use the `GOOGLE_SERVICES_JSON` secret inside a GitHub Actions workflow, you can write:

```yaml
- name: Create google-services.json
  run: |
    mkdir -p app
    echo '${{ secrets.GOOGLE_SERVICES_JSON }}' > app/google-services.json
```

This ensures your secrets are securely injected into the build process without being hardcoded in your repository. 🚀

# **Setup and Build APK with Gradle**

## **Setup Job**

The `setup` job is responsible for preparing the environment, generating necessary configuration files, and handling secrets securely.

```yaml
setup:
    name: Setup
    runs-on: ubuntu-latest
    outputs:
      short_sha: ${{ steps.sha.outputs.sha }}
    steps:
      - name: Create google-services.json
        run: |
          mkdir -p app
          echo '${{ secrets.GOOGLE_SERVICES_JSON }}' > app/google-services.json

      - name: Create secrets.xml
        run: |
          mkdir -p app/src/main/res/values
          cat << EOF > app/src/main/res/values/secrets.xml
          <?xml version="1.0" encoding="utf-8"?>
          <resources>
              <string name="fcm_server_key">${{ secrets.FCM_SERVER_KEY }}</string>
          </resources>
          EOF

      - name: Get short SHA
        id: sha
        run: echo "sha=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Upload config files
        uses: actions/upload-artifact@v4
        with:
          name: config-files
          path: |
            app/google-services.json
            app/src/main/res/values/secrets.xml
          retention-days: 1
```

This job ensures that all required secret files and metadata are created within the GitHub worker before the build process begins. You can add more secrets as needed, making this job the central place for managing them dynamically.

## **Setting Up Java and Gradle in GitHub Actions**

Before building the APK, we need to set up Java and Gradle in the GitHub Actions environment.

```yaml
build:
    name: Build APK
    runs-on: ubuntu-latest
    needs: setup
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up JDK
        uses: actions/setup-java@v4
        with:
          distribution: 'oracle'
          java-version: '17'
          cache: gradle

      - name: Download config files
        uses: actions/download-artifact@v4
        with:
          name: config-files
          path: ./app

      - name: Change Gradle Wrapper Permissions
        run: chmod +x gradlew
```

This step ensures that the environment is ready with the correct Java version and Gradle configuration.

## **Running the Gradle Build Process**

Once the environment is set up, we can proceed with building the APK using Gradle.

```yaml
      - name: Build with Gradle
        run: ./gradlew assembleDebug
```

> To ensure that the generated APK can be accessed in the next job, we upload it as an artifact.

```yaml
      - name: Upload APK
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: app/build/outputs/apk/debug/app-debug.apk
          retention-days: 1
```

This ensures that the APK is stored temporarily and can be used in subsequent jobs, such as creating a GitHub release.

# **Automating GitHub Releases**

Once the APK is built, the next step is to automate the release process on GitHub. This includes dynamically generating version tags, uploading the APK as a release asset, and automatically generating release notes.

## **Generating Version Tags Dynamically**

To track versions effectively, we generate a new tag based on the latest commit.

```yaml
- name: Get Last Tag
  id: get_last_tag
  run: |
    git fetch --tags
    LAST_TAG=$(git describe --abbrev=0 --tags || echo "none")
    echo "last_tag=${LAST_TAG}" >> $GITHUB_OUTPUT

- name: Generate New Tag
  id: generate_new_tag
  run: |
    echo "new_tag=1.0-${GITHUB_SHA::7}" >> $GITHUB_OUTPUT
```

> This retrieves the last version tag (if any) and generates a new tag based on the latest commit SHA.

## **Uploading the APK to a GitHub Release and Generating Release Notes**

After generating the APK, we create a GitHub release, attach the APK, and automatically generate release notes.

```yaml
- name: Create Release
  id: create_release
  uses: softprops/action-gh-release@v2
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    tag_name: ${{ steps.generate_new_tag.outputs.new_tag }}
    name: "Release ${{ steps.generate_new_tag.outputs.new_tag }}"
    body: |
      ## What's Changed
      **Full Changelog**: https://github.com/${{ github.repository }}/compare/${{ steps.get_last_tag.outputs.last_tag }}...${{ steps.generate_new_tag.outputs.new_tag }}
    draft: false
    prerelease: false
    files: |
      app/build/outputs/apk/debug/app-debug.apk
```

Here’s what’s happening:

* **Tagging the release** with the newly generated version.
    
* **Attaching the APK file** to the release.
    
* **Generating a changelog** using GitHub’s comparison link between the last release and the new one.
    

> If you want more detailed release notes, you can integrate an LLM API to generate a summary of changes dynamically.

# **Enhancing the Workflow**

## **Signing the APK for Production**

For production builds, the APK must be signed before uploading to Google Play. To do this, store your keystore file as a GitHub secret (Base64 encoded) and use the following steps in your workflow:

```yaml
- name: Decode Keystore
  run: |
    echo "${{ secrets.ANDROID_KEYSTORE }}" | base64 --decode > app/keystore.jks

- name: Sign APK
  run: |
    jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
    -keystore app/keystore.jks -storepass ${{ secrets.KEYSTORE_PASSWORD }} \
    app/build/outputs/apk/release/app-release-unsigned.apk my-key-alias
```

> This will sign the APK using the keystore stored in GitHub Secrets.

## **Uploading the APK to Google Play (Optional)**

If you want to automate the deployment to Google Play, you can use **Google Play Developer API** along with the `r0adkll/upload-google-play` GitHub Action.

```yaml
- name: Upload to Google Play
  uses: r0adkll/upload-google-play@v1
  with:
    serviceAccountJson: ${{ secrets.PLAY_STORE_SERVICE_ACCOUNT }}
    packageName: com.example.app
    releaseFiles: app/build/outputs/apk/release/app-release.apk
    track: production
    status: completed
```

> This will upload the signed APK directly to Google Play’s internal testing or production track.

# **Full Workflow File**

```yaml
name: Build APK  # Name of the workflow

on:
  push:
    branches:
      - main  # Runs when code is pushed to the main branch
  workflow_dispatch:  # Allows manual triggering of the workflow

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}  # Prevents duplicate runs on the same branch

permissions:
  contents: write
  pull-requests: write
  packages: write

jobs:
  setup:
    name: Setup
    runs-on: ubuntu-latest
    outputs:
      short_sha: ${{ steps.sha.outputs.sha }}
    steps:
      - name: Create google-services.json  # Creates Firebase configuration file
        run: |
          mkdir -p app
          echo '${{ secrets.GOOGLE_SERVICES_JSON }}' > app/google-services.json

      - name: Create secrets.xml  # Stores API keys securely in a resource file
        run: |
          mkdir -p app/src/main/res/values
          cat << EOF > app/src/main/res/values/secrets.xml
          <?xml version="1.0" encoding="utf-8"?>
          <resources>
              <string name="fcm_server_key">${{ secrets.FCM_SERVER_KEY }}</string>
          </resources>
          EOF

      - name: Get short SHA  # Extracts a short commit hash for versioning
        id: sha
        run: echo "sha=${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Upload config files  # Stores secret files for later use
        uses: actions/upload-artifact@v4
        with:
          name: config-files
          path: |
            app/google-services.json
            app/src/main/res/values/secrets.xml
          retention-days: 1

  build:
    name: Build APK
    runs-on: ubuntu-latest
    needs: setup  # Ensures setup job is completed first
    steps:
      - name: Checkout code  # Clones the repository
        uses: actions/checkout@v4

      - name: Set up JDK  # Installs Java for building the APK
        uses: actions/setup-java@v4
        with:
          distribution: 'oracle'
          java-version: '17'
          cache: gradle  # Caches dependencies to speed up builds

      - name: Download config files  # Retrieves secret files
        uses: actions/download-artifact@v4
        with:
          name: config-files
          path: ./app

      - name: Change Gradle Wrapper Permissions  # Ensures the Gradle wrapper script is executable
        run: chmod +x gradlew

      - name: Build with Gradle  # Compiles the APK
        run: ./gradlew assembleDebug

      - name: Upload APK  # Stores the built APK for the next job
        uses: actions/upload-artifact@v4
        with:
          name: app-debug
          path: app/build/outputs/apk/debug/app-debug.apk
          retention-days: 1

  create-release:
    name: Create Release
    runs-on: ubuntu-latest
    needs: [ setup, build ]  # Ensures previous jobs are completed first
    steps:
      - name: Checkout code  # Clones the repository with full history
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Download APK  # Retrieves the built APK
        uses: actions/download-artifact@v4
        with:
          name: app-debug
          path: app/build/outputs/apk/debug

      - name: Get Last Tag  # Fetches the latest version tag
        id: get_last_tag
        run: |
          git fetch --tags
          LAST_TAG=$(git describe --abbrev=0 --tags || echo "none")
          echo "last_tag=${LAST_TAG}" >> $GITHUB_OUTPUT

      - name: Generate New Tag  # Creates a new version tag using commit SHA
        id: generate_new_tag
        run: |
          echo "new_tag=1.0-${GITHUB_SHA::7}" >> $GITHUB_OUTPUT

      - name: Create Release  # Publishes the new APK as a GitHub release
        id: create_release
        uses: softprops/action-gh-release@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.generate_new_tag.outputs.new_tag }}
          name: "Release ${{ steps.generate_new_tag.outputs.new_tag }}"
          body: |
            ## What's Changed
            **Full Changelog**: https://github.com/${{ github.repository }}/compare/${{ steps.get_last_tag.outputs.last_tag }}...${{ steps.generate_new_tag.outputs.new_tag }}
          draft: false  # Publishes the release immediately
          prerelease: false
          files: |
            app/build/outputs/apk/debug/app-debug.apk
```

![](https://cdn.hashnode.com/res/hashnode/image/upload/v1742508753378/3494064e-08c8-4b74-b9b0-e59755fbc95d.png align="center")

> I have omitted the signing and deployment part from this since they are use-case specific and do not apply to every hobbyist Android developer.

# **Conclusion**

With this fully automated workflow, building, releasing, and publishing your APKs becomes effortless using GitHub Actions. This setup is perfect for hobby developers and students who want to showcase their projects without the hassle of manually generating and sharing APKs. Now, instead of scrambling to find the latest build on your PC when someone asks for your app, you can simply share a GitHub release link—just like web developers share their hosted sites.

Embrace automation and let GitHub Actions handle the heavy lifting, so you can focus on what truly matters—building great Android apps! 🚀