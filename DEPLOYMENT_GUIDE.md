# Deploying Voxen to AWS (EC2 & S3)

This guide provides step-by-step instructions to deploy the **Voxen Backend** to an AWS EC2 instance and the **Voxen Frontend** to an AWS S3 bucket as a static website.

---

## Part 1: Backend Deployment (EC2)

### 1. Launch an EC2 Instance
1.  Log in to the AWS Console and go to **EC2**.
2.  Click **Launch Instance**.
3.  **Name**: `voxen-backend`
4.  **AMI**: **Ubuntu Server 24.04 LTS** (or 22.04 LTS).
5.  **Instance Type**: `t2.micro` (Free Tier eligible) or larger if needed.
6.  **Key Pair**: Create a new key pair (e.g., `voxen-key`), download the `.pem` file.
7.  **Network Settings**:
    -   Create a security group allowing:
        -   **SSH (22)** from your IP (or Anywhere `0.0.0.0/0`).
        -   **HTTP (80)** from Anywhere.
        -   **HTTPS (443)** from Anywhere.
        -   **Custom TCP (4000)** from Anywhere (optional, for testing before Nginx setup).

### 2. Connect to EC2
Open your terminal (or git bash):
```bash
chmod 400 voxen-key.pem
ssh -i "voxen-key.pem" ubuntu@<your-ec2-public-ip>
```

### 3. Install Dependencies (Node.js, PM2, Nginx)
Run the following commands on the server (Amazon Linux 2023 / Amazon Linux 2):

```bash
# Update system
sudo yum update -y

# Install Git
sudo yum install -y git

# Install Node.js (v20)
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo yum install -y nodejs

# Verify installation
node -v
npm -v

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx (Reverse Proxy)
sudo yum install -y nginx

# Start and Enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 4. Deploy Backend Code
1.  **Clone your repository** (or upload files via SCP/SFTP):
    ```bash
    git clone <your-repo-url>
    cd Voxen/Backend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Setup Environment Variables**:
    Create a `.env` file:
    ```bash
    nano .env
    ```
    Paste your `.env` content (Database URL, JWT Secret, etc.).
    **Important**: Set `FRONTEND_URL` to your future frontend S3 URL (e.g., `http://voxen-frontend.s3-website-region.amazonaws.com` or your custom domain).

### 5. Start Backend with PM2
```bash
# Start the app (assuming index.js is entry point)
pm2 start src/index.js --name "voxen-backend"

# Save PM2 list to respawn on reboot
pm2 save
pm2 startup
# (Run the command output by pm2 startup, usually involves copying a line with 'sudo')
```

### 6. Configure Nginx Reverse Proxy
Set up Nginx to forward requests from port 80 to your Node app on port 4000.

1.  **Create a new config file** (Do not edit `nginx.conf` directly to avoid syntax errors):
    ```bash
    sudo nano /etc/nginx/conf.d/voxen.conf
    ```
2.  **Paste the following content** and save (Ctrl+O, Enter, Ctrl+X):
    ```nginx
    server {
        listen 80;
        server_name _;

        location / {
            proxy_pass http://localhost:4000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```
3.  **Disable the default server** (to avoid conflicts):
    *Open the main config:*
    ```bash
    sudo nano /etc/nginx/nginx.conf
    ```
    *Find the default `server { ... }` block (usually lines 39-57) and comment it out with `#`, or delete it. Ensure you leave the `events { }` and `http { }` blocks intact.*

4.  **Check syntax and restart**:
    ```bash
    sudo nginx -t
    sudo systemctl restart nginx
    ```

### 7. (Optional) SSL with Certbot
Requires a domain name pointing to the EC2 IP.
```bash
# For Amazon Linux 2023
sudo dnf install -y python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com

# For Amazon Linux 2
# sudo amazon-linux-extras install epel -y
# sudo yum install -y certbot python2-certbot-nginx
```


---

## Part 2: Frontend Deployment (S3)

### 1. Prepare Frontend Build
1.  In your local `frontend` directory, ensure `.env.production` exists with the correct API URL (pointing to your EC2 backend):
    ```env
    NEXT_PUBLIC_API_URL=http://<your-ec2-public-ip>/api
    NEXT_PUBLIC_BLOCKCHAIN_NETWORK=mainnet
    # ... other vars
    ```
2.  Run the build command:
    ```bash
    npm run build
    ```
    This will create an `out/` folder containing the static site.

### 2. Create S3 Bucket
1.  Go to **Amazon S3** console.
2.  Click **Create bucket**.
3.  **Name**: `voxen-frontend` (must be globally unique).
4.  **Region**: Same as your users (e.g., `us-east-1`).
5.  **Block Public Access**: Uncheck "Block all public access" (you need it public for static hosting). Acknowledge warnings.
6.  Click **Create bucket**.

### 3. Configure Static Website Hosting
1.  Go to the bucket -> **Properties**.
2.  Scroll to **Static website hosting** -> **Edit**.
3.  Select **Enable**.
4.  **Index document**: `index.html`.
5.  **Error document**: `index.html` (Important for SPA routing).
6.  Save changes.
7.  Note the **Bucket website endpoint** URL.

### 4. Upload Files
1.  Go to **Objects** tab.
2.  Upload the **contents** of your local `out/` folder (not the folder itself, but the files inside).
3.  Wait for upload to complete.

### 5. Set Bucket Policy
Allow public read access to objects.
1.  Go to **Permissions** tab -> **Bucket policy** -> **Edit**.
2.  Paste this policy (replace `Bucket-Name`):
    ```json
    {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "PublicReadGetObject",
                "Effect": "Allow",
                "Principal": "*",
                "Action": "s3:GetObject",
                "Resource": "arn:aws:s3:::<YOUR-BUCKET-NAME>/*"
            }
        ]
    }
    ```
3.  Save changes.

---

## Part 3: Final Integration

1.  **Update Backend CORS**:
    -   SSH back into EC2.
    -   Edit `.env`.
    -   Update `FRONTEND_URL` to your **S3 Website Endpoint** (e.g., `http://voxen-frontend.s3-website-us-east-1.amazonaws.com`).
    -   Restart backend: `pm2 restart voxen-backend`.

2.  **Test**:
    -   Open your S3 Website Endpoint in the browser.
    -   Try signing in (Wallet Connect).
    -   Verify API calls in Network tab are hitting your EC2 IP.

## (Recommended) Advanced: CloudFront CDN
For HTTPS on frontend and better performance:
1.  Create a CloudFront Distribution.
2.  **Origin Domain**: Select your S3 bucket endpoint.
3.  **Viewer Protocol Policy**: Redirect HTTP to HTTPS.
4.  Use the CloudFront URL (e.g., `https://d1234.cloudfront.net`) as your frontend URL.
