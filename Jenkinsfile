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
                bat '"C:\\Users\\HP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe" build -t todo-jenkins:latest .'
            }
        }

        stage('Deploy') {
            steps {
                bat '''
                    "C:\\Users\\HP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe" stop todo-app 2>nul || exit /b 0
                    "C:\\Users\\HP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe" rm todo-app 2>nul || exit /b 0
                    "C:\\Users\\HP\\AppData\\Local\\Programs\\DockerDesktop\\resources\\bin\\docker.exe" run -d --name todo-app -p 3000:3000 todo-jenkins:latest
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
            bat 'echo ========================================'
            bat 'echo Deployment successful!'
            bat 'echo Application: http://localhost:3000'
            bat 'echo ========================================'
        }

        failure {
            bat 'echo Pipeline failed. Check the console output.'
        }
    }
}
