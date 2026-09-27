pipeline {
    agent any

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                bat 'npm ci'
            }
        }

        stage('Test') {
            steps {
                bat 'npm test'
            }
        }

        stage('Build Docker Image') {
            steps {
                bat 'docker build -t todo-jenkins:latest .'
            }
        }

        stage('Deploy') {
            steps {
                bat '''
                    docker stop todo-app 2>nul || exit /b 0
                    docker rm todo-app 2>nul || exit /b 0
                    docker run -d --name todo-app -p 3000:3000 todo-jenkins:latest
                '''
            }
        }

        stage('Verify') {
            steps {
                bat 'curl.exe -f http://localhost:3000/health'
            }
        }
    }

    post {
        always {
            bat 'echo Jenkins pipeline completed.'
        }

        success {
            bat 'echo Deployment successful!'
        }

        failure {
            bat 'echo Pipeline failed. Check the console output.'
        }
    }
}