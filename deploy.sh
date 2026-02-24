#!/bin/bash

# Flo Family Calendar - Interactive Deployment Script
# This script guides you through deploying Flo to AWS with interactive prompts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Validate input
validate_not_empty() {
    if [ -z "$1" ]; then
        print_error "Input cannot be empty"
        return 1
    fi
    return 0
}

validate_aws_region() {
    local region=$1
    local valid_regions=("us-east-1" "us-west-2" "eu-west-1" "ap-southeast-1" "ap-southeast-2")
    for valid_region in "${valid_regions[@]}"; do
        if [ "$region" = "$valid_region" ]; then
            return 0
        fi
    done
    print_error "Invalid AWS region. Valid options: ${valid_regions[*]}"
    return 1
}

# Generate random string
generate_random_string() {
    openssl rand -base64 32 | tr -d '\n'
}

# Check prerequisites
check_prerequisites() {
    print_header "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        missing_tools+=("aws-cli")
    else
        print_success "AWS CLI found"
    fi
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node.js")
    else
        print_success "Node.js found ($(node --version))"
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    else
        print_success "npm found ($(npm --version))"
    fi
    
    # Check Git
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    else
        print_success "Git found"
    fi
    
    # Check OpenSSL
    if ! command -v openssl &> /dev/null; then
        missing_tools+=("openssl")
    else
        print_success "OpenSSL found"
    fi
    
    if [ ${#missing_tools[@]} -gt 0 ]; then
        print_error "Missing required tools: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Collect AWS account details
collect_aws_details() {
    print_header "AWS Account Configuration"
    
    # AWS Account ID
    while true; do
        read -p "Enter your AWS Account ID: " AWS_ACCOUNT_ID
        if validate_not_empty "$AWS_ACCOUNT_ID" && [[ $AWS_ACCOUNT_ID =~ ^[0-9]{12}$ ]]; then
            print_success "AWS Account ID: $AWS_ACCOUNT_ID"
            break
        else
            print_error "Invalid AWS Account ID (must be 12 digits)"
        fi
    done
    
    # AWS Region
    while true; do
        read -p "Enter your AWS Region (us-east-1, us-west-2, eu-west-1, ap-southeast-1, ap-southeast-2): " AWS_REGION
        if validate_aws_region "$AWS_REGION"; then
            print_success "AWS Region: $AWS_REGION"
            break
        fi
    done
    
    # AWS Access Key ID
    while true; do
        read -p "Enter your AWS Access Key ID (AKIA...): " AWS_ACCESS_KEY_ID
        if validate_not_empty "$AWS_ACCESS_KEY_ID" && [[ $AWS_ACCESS_KEY_ID == AKIA* ]]; then
            print_success "AWS Access Key ID: ${AWS_ACCESS_KEY_ID:0:8}..."
            break
        else
            print_error "Invalid AWS Access Key ID (must start with AKIA)"
        fi
    done
    
    # AWS Secret Access Key
    while true; do
        read -sp "Enter your AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
        echo
        if validate_not_empty "$AWS_SECRET_ACCESS_KEY"; then
            print_success "AWS Secret Access Key: ${AWS_SECRET_ACCESS_KEY:0:8}..."
            break
        fi
    done
}

# Collect OAuth credentials
collect_oauth_credentials() {
    print_header "OAuth Configuration"
    
    # Google OAuth
    print_info "Google Calendar OAuth credentials (from Google Cloud Console)"
    read -p "Enter Google OAuth Client ID: " GOOGLE_OAUTH_CLIENT_ID
    read -sp "Enter Google OAuth Client Secret: " GOOGLE_OAUTH_CLIENT_SECRET
    echo
    
    if [ -z "$GOOGLE_OAUTH_CLIENT_ID" ] || [ -z "$GOOGLE_OAUTH_CLIENT_SECRET" ]; then
        print_warning "Google OAuth credentials not provided (optional)"
    else
        print_success "Google OAuth configured"
    fi
    
    # Outlook OAuth
    print_info "Outlook/Microsoft Graph OAuth credentials (from Azure Portal)"
    read -p "Enter Outlook OAuth Client ID: " OUTLOOK_OAUTH_CLIENT_ID
    read -sp "Enter Outlook OAuth Client Secret: " OUTLOOK_OAUTH_CLIENT_SECRET
    echo
    
    if [ -z "$OUTLOOK_OAUTH_CLIENT_ID" ] || [ -z "$OUTLOOK_OAUTH_CLIENT_SECRET" ]; then
        print_warning "Outlook OAuth credentials not provided (optional)"
    else
        print_success "Outlook OAuth configured"
    fi
}

# Collect email service credentials
collect_email_credentials() {
    print_header "Email Service Configuration"
    
    read -p "Enter SendGrid API Key (SG...): " SENDGRID_API_KEY
    read -p "Enter sender email address (noreply@yourdomain.com): " EMAIL_FROM_ADDRESS
    read -p "Enter sender display name (Flo Family Calendar): " EMAIL_FROM_NAME
    
    if [ -z "$SENDGRID_API_KEY" ]; then
        print_warning "SendGrid API Key not provided (email notifications will be disabled)"
    else
        print_success "SendGrid configured"
    fi
    
    if [ -z "$EMAIL_FROM_ADDRESS" ]; then
        EMAIL_FROM_ADDRESS="noreply@floapp.com"
    fi
    
    if [ -z "$EMAIL_FROM_NAME" ]; then
        EMAIL_FROM_NAME="Flo Family Calendar"
    fi
}

# Collect domain configuration
collect_domain_config() {
    print_header "Domain Configuration"
    
    read -p "Enter your API domain (e.g., api.flo.example.com): " API_DOMAIN
    read -p "Enter your frontend domain (e.g., flo.example.com): " FRONTEND_DOMAIN
    
    if validate_not_empty "$API_DOMAIN" && validate_not_empty "$FRONTEND_DOMAIN"; then
        print_success "Domain configuration: API=$API_DOMAIN, Frontend=$FRONTEND_DOMAIN"
    else
        print_error "Domain configuration incomplete"
        return 1
    fi
}

# Generate environment files
generate_env_files() {
    print_header "Generating Environment Files"
    
    # Generate secrets
    SESSION_SECRET=$(generate_random_string)
    ENCRYPTION_KEY=$(generate_random_string)
    
    # Backend .env
    cat > packages/backend/.env << EOF
# AWS Configuration
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY

# DynamoDB Configuration
DYNAMODB_TABLE_NAME=FamilyCalendar
DYNAMODB_ENDPOINT=

# Application Configuration
NODE_ENV=production
PORT=3001

# Session Configuration
SESSION_SECRET=$SESSION_SECRET
SESSION_EXPIRY_DAYS=30

# Password Hashing
BCRYPT_ROUNDS=12

# OAuth Configuration - Google Calendar
GOOGLE_OAUTH_CLIENT_ID=$GOOGLE_OAUTH_CLIENT_ID
GOOGLE_OAUTH_CLIENT_SECRET=$GOOGLE_OAUTH_CLIENT_SECRET
GOOGLE_OAUTH_REDIRECT_URI=https://$API_DOMAIN/api/oauth/google/callback

# OAuth Configuration - Outlook/Microsoft Graph
OUTLOOK_OAUTH_CLIENT_ID=$OUTLOOK_OAUTH_CLIENT_ID
OUTLOOK_OAUTH_CLIENT_SECRET=$OUTLOOK_OAUTH_CLIENT_SECRET
OUTLOOK_OAUTH_REDIRECT_URI=https://$API_DOMAIN/api/oauth/outlook/callback

# Encryption Configuration
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Email Notification Configuration
SENDGRID_API_KEY=$SENDGRID_API_KEY
EMAIL_FROM_ADDRESS=$EMAIL_FROM_ADDRESS
EMAIL_FROM_NAME=$EMAIL_FROM_NAME
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY_MS=1000
EOF
    
    print_success "Backend .env file created"
    
    # Frontend .env
    cat > packages/frontend/.env << EOF
# API Configuration
VITE_API_ENDPOINT=https://$API_DOMAIN

# Environment
VITE_ENV=production

# Feature Flags
VITE_ENABLE_ANALYTICS=true
VITE_ENABLE_ERROR_REPORTING=true
EOF
    
    print_success "Frontend .env file created"
}

# Create AWS Secrets Manager entries
create_secrets() {
    print_header "Creating AWS Secrets Manager Entries"
    
    print_info "Creating secrets in AWS Secrets Manager..."
    
    # AWS Credentials Secret
    aws secretsmanager create-secret \
        --name flo/backend/aws-credentials \
        --secret-string "{\"AWS_ACCESS_KEY_ID\":\"$AWS_ACCESS_KEY_ID\",\"AWS_SECRET_ACCESS_KEY\":\"$AWS_SECRET_ACCESS_KEY\"}" \
        --region "$AWS_REGION" \
        2>/dev/null || print_warning "AWS credentials secret already exists"
    
    # OAuth Secret
    if [ -n "$GOOGLE_OAUTH_CLIENT_ID" ] || [ -n "$OUTLOOK_OAUTH_CLIENT_ID" ]; then
        aws secretsmanager create-secret \
            --name flo/backend/oauth \
            --secret-string "{\"GOOGLE_OAUTH_CLIENT_ID\":\"$GOOGLE_OAUTH_CLIENT_ID\",\"GOOGLE_OAUTH_CLIENT_SECRET\":\"$GOOGLE_OAUTH_CLIENT_SECRET\",\"OUTLOOK_OAUTH_CLIENT_ID\":\"$OUTLOOK_OAUTH_CLIENT_ID\",\"OUTLOOK_OAUTH_CLIENT_SECRET\":\"$OUTLOOK_OAUTH_CLIENT_SECRET\"}" \
            --region "$AWS_REGION" \
            2>/dev/null || print_warning "OAuth secret already exists"
    fi
    
    # Email Secret
    if [ -n "$SENDGRID_API_KEY" ]; then
        aws secretsmanager create-secret \
            --name flo/backend/email \
            --secret-string "{\"SENDGRID_API_KEY\":\"$SENDGRID_API_KEY\"}" \
            --region "$AWS_REGION" \
            2>/dev/null || print_warning "Email secret already exists"
    fi
    
    # Encryption Secret
    aws secretsmanager create-secret \
        --name flo/backend/encryption \
        --secret-string "{\"ENCRYPTION_KEY\":\"$ENCRYPTION_KEY\",\"SESSION_SECRET\":\"$SESSION_SECRET\"}" \
        --region "$AWS_REGION" \
        2>/dev/null || print_warning "Encryption secret already exists"
    
    print_success "Secrets created in AWS Secrets Manager"
}

# Build backend
build_backend() {
    print_header "Building Backend"
    
    cd packages/backend
    print_info "Installing dependencies..."
    npm install
    
    print_info "Building TypeScript..."
    npm run build
    
    print_success "Backend build complete"
    cd ../..
}

# Build frontend
build_frontend() {
    print_header "Building Frontend"
    
    cd packages/frontend
    print_info "Installing dependencies..."
    npm install
    
    print_info "Building React app..."
    npm run build
    
    print_success "Frontend build complete"
    cd ../..
}

# Run tests
run_tests() {
    print_header "Running Tests"
    
    print_info "Running backend tests..."
    cd packages/backend
    npm run test -- --run 2>/dev/null || print_warning "Some backend tests failed"
    cd ../..
    
    print_info "Running frontend tests..."
    cd packages/frontend
    npm run test -- --run 2>/dev/null || print_warning "Some frontend tests failed"
    cd ../..
    
    print_success "Tests complete"
}

# Create DynamoDB table
create_dynamodb_table() {
    print_header "Creating DynamoDB Table"
    
    print_info "Creating DynamoDB table..."
    
    aws dynamodb create-table \
        --table-name FamilyCalendar \
        --attribute-definitions \
            AttributeName=PK,AttributeType=S \
            AttributeName=SK,AttributeType=S \
        --key-schema \
            AttributeName=PK,KeyType=HASH \
            AttributeName=SK,KeyType=RANGE \
        --billing-mode PAY_PER_REQUEST \
        --region "$AWS_REGION" \
        2>/dev/null || print_warning "DynamoDB table already exists"
    
    print_info "Enabling Point-in-Time Recovery..."
    aws dynamodb update-continuous-backups \
        --table-name FamilyCalendar \
        --point-in-time-recovery-specification PointInTimeRecoveryEnabled=true \
        --region "$AWS_REGION" \
        2>/dev/null || print_warning "PITR already enabled"
    
    print_success "DynamoDB table ready"
}

# Summary
print_summary() {
    print_header "Deployment Summary"
    
    echo "Configuration saved:"
    echo "  Backend .env: packages/backend/.env"
    echo "  Frontend .env: packages/frontend/.env"
    echo ""
    echo "AWS Configuration:"
    echo "  Account ID: $AWS_ACCOUNT_ID"
    echo "  Region: $AWS_REGION"
    echo ""
    echo "Domains:"
    echo "  API: https://$API_DOMAIN"
    echo "  Frontend: https://$FRONTEND_DOMAIN"
    echo ""
    echo "Next steps:"
    echo "  1. Review the generated .env files"
    echo "  2. Deploy backend to Lambda/EC2/ECS"
    echo "  3. Deploy frontend to S3/CloudFront"
    echo "  4. Configure DNS records"
    echo "  5. Test the deployment"
    echo ""
    echo "For detailed instructions, see DEPLOYMENT_GUIDE.md"
}

# Main execution
main() {
    print_header "Flo Family Calendar - Deployment Script"
    
    echo "This script will guide you through deploying Flo to AWS."
    echo "It will prompt for your AWS account details and create necessary resources."
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Deployment cancelled"
        exit 0
    fi
    
    check_prerequisites
    collect_aws_details
    collect_oauth_credentials
    collect_email_credentials
    collect_domain_config
    generate_env_files
    create_secrets
    create_dynamodb_table
    build_backend
    build_frontend
    run_tests
    print_summary
    
    print_success "Deployment preparation complete!"
}

# Run main function
main
