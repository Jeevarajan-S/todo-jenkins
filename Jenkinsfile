// Jenkins declarative pipeline for the To-Do List app.
// Flow: Checkout -> Install Dependencies -> Test -> Build Docker Image -> Deploy -> Verify
//
// Requirements on the Jenkins machine (see README):
//   - Node.js 18+ and npm
//   - Docker, with the "jenkins" user added to the "docker" group
//   - curl
// Only core pipeline features and the Git plugin are used (both come with
// the "suggested plugins" install).

pipeline {
    agent any

    environment {
        APP_NAME       = 'todo-app'                 // Docker container name
        IMAGE_NAME     = 'todo-jenkins'             // Docker image name
        IMAGE_TAG      = "${env.BUILD_NUMBER}"      // each build gets its own tag
        HOST_PORT      = '3000'                     // port opened on the server
        CONTAINER_PORT = '3000'                     // port the app listens on inside the container
        APP_VERSION    = "1.0.${env.BUILD_NUMBER}"  // shown in the app footer and /health
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out source code from GitHub...'
                checkout scm
                sh 'git log -1 --oneline'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing npm dependencies...'
                sh '''
                    node --version
                    npm --version
                    npm install
                '''
            }
        }

        stage('Test') {
            steps {
                echo 'Running automated tests...'
                sh 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                echo "Building Docker image ${IMAGE_NAME}:${IMAGE_TAG}..."
                sh '''
                    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} -t ${IMAGE_NAME}:latest .
                    docker images ${IMAGE_NAME}
                '''
            }
        }

        stage('Deploy') {
            steps {
                echo 'Replacing the running container with the new version...'
                sh '''
                    # Stop and remove the old container if it exists (ignore errors if it does not)
                    if [ "$(docker ps -aq -f name=^${APP_NAME}$)" ]; then
                        echo "Removing previous container ${APP_NAME}"
                        docker stop ${APP_NAME} || true
                        docker rm ${APP_NAME} || true
                    else
                        echo "No previous container found"
                    fi

                    docker run -d \
                        --name ${APP_NAME} \
                        --restart unless-stopped \
                        -p ${HOST_PORT}:${CONTAINER_PORT} \
                        -e PORT=${CONTAINER_PORT} \
                        -e APP_VERSION=${APP_VERSION} \
                        ${IMAGE_NAME}:${IMAGE_TAG}

                    docker ps -f name=^${APP_NAME}$
                '''
            }
        }

        stage('Verify') {
            steps {
                echo 'Checking that the application responds...'
                sh '''
                    for i in $(seq 1 10); do
                        if curl -fs http://localhost:${HOST_PORT}/health; then
                            echo ""
                            echo "Application is up (attempt $i)."
                            curl -fs -o /dev/null -w "Main page HTTP status: %{http_code}\\n" http://localhost:${HOST_PORT}/
                            exit 0
                        fi
                        echo "Not ready yet (attempt $i/10), waiting 3 seconds..."
                        sleep 3
                    done

                    echo "Application did not respond. Container logs:"
                    docker logs ${APP_NAME} || true
                    exit 1
                '''
            }
        }
    }

    post {
        success {
            echo "Deployed ${IMAGE_NAME}:${IMAGE_TAG} -> http://<server-ip>:${HOST_PORT}"
        }
        failure {
            echo 'Pipeline failed. Check the stage logs above for the error.'
        }
        always {
            // Remove dangling images left over from previous builds to save disk space
            sh 'docker image prune -f || true'
        }
    }
}
