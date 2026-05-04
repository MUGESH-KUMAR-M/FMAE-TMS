# AWS Docker Deployment Guide for FMAE-TMS

This guide provides step-by-step instructions to deploy the FMAE-TMS (Formula SAE Team Management System) application on AWS using Docker and Docker Compose.

## Prerequisites

- AWS Account
- Git repository with the FMAE-TMS code
- Basic knowledge of AWS EC2, Security Groups, and SSH

## Architecture Overview

The application consists of:
- **Backend**: Node.js API server (port 5000)
- **Frontend**: React application served by Nginx (port 3000)
- **Database**: PostgreSQL (port 5432, internal only)

## Step 1: Launch EC2 Instance

1. Go to AWS EC2 Console
2. Click "Launch Instance"
3. Choose AMI: Ubuntu Server 22.04 LTS (HVM)
4. Instance Type: t3.small (or t2.micro for free tier)
5. Configure Security Group:
   - SSH (22) - Your IP address
   - HTTP (80) - 0.0.0.0/0
   - HTTPS (443) - 0.0.0.0/0
   - Custom TCP (3000) - 0.0.0.0/0 (Frontend)
   - Custom TCP (5000) - 0.0.0.0/0 (Backend API, optional)
6. Launch instance and note the Public IP

## Step 2: Connect to EC2 Instance

```bash
ssh -i your-key.pem ubuntu@<public-ip>
```

## Step 3: Install Docker and Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
sudo apt install -y docker.io docker-compose

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Logout and login again
exit
ssh -i your-key.pem ubuntu@<public-ip>
```

## Step 4: Clone Repository

```bash
git clone https://github.com/your-username/FMAE-TMS.git
cd FMAE-TMS
```

## Step 5: Configure Environment Variables

Edit `docker-compose.yml` and update the following:

```yaml
environment:
  JWT_SECRET: "your-secure-jwt-secret-here-change-this"
  POSTGRES_PASSWORD: "your-secure-db-password"
```

For production, consider using AWS Systems Manager Parameter Store.

## Step 6: Build and Run Application

```bash
# Build and start services
docker-compose up --build -d

# Check status
docker ps

# View logs
docker-compose logs -f
```

## Step 7: Verify Deployment

```bash
# Test backend API
curl http://localhost:5000/api/health

# Test frontend
curl http://localhost:3000
```

Access the application at: `http://<public-ip>:3000`

## Step 8: Set Up Domain (Optional)

1. Register domain with Route 53
2. Point domain to EC2 public IP
3. Install Nginx for reverse proxy:

```bash
sudo apt install -y nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/fmae-tms

# Add this content:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api {
        proxy_pass http://localhost:5000/api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/fmae-tms /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## Step 9: SSL Certificate (Optional)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## Updating the Application

```bash
# SSH to instance
ssh -i your-key.pem ubuntu@<public-ip>

# Navigate to project
cd FMAE-TMS

# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose down
docker-compose up --build -d
```

## Monitoring and Maintenance

- **Logs**: `docker-compose logs -f [service]`
- **Restart services**: `docker-compose restart`
- **Backup database**: Use PostgreSQL tools or AWS RDS
- **Monitoring**: Consider AWS CloudWatch

## Troubleshooting

- **Port conflicts**: Check `netstat -tlnp | grep :[port]`
- **Container issues**: `docker logs [container_name]`
- **Build failures**: Ensure all dependencies are available
- **Network issues**: Verify security groups allow required ports

## Security Best Practices

- Use strong passwords for database and JWT
- Restrict SSH access to your IP
- Enable AWS CloudTrail and GuardDuty
- Regularly update packages: `sudo apt update && sudo apt upgrade`
- Use AWS IAM roles instead of access keys
- Implement rate limiting and CORS properly

## Cost Optimization

- Use EC2 Spot instances for development
- Set up auto-scaling groups for production
- Use AWS RDS instead of containerized PostgreSQL for production
- Implement CloudWatch alarms for cost monitoring

## Next Steps

For production workloads, consider:
- AWS ECS/Fargate for container orchestration
- AWS RDS for managed database
- AWS Elastic Load Balancer for high availability
- AWS CloudFront for CDN
- AWS S3 for file storage