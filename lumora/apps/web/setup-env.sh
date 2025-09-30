#!/bin/bash

echo "Setting up environment for Lumora..."
echo ""

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOF
# OpenAI API Key (required)
OPENAI_API_KEY=sk-your-openai-api-key-here

# MongoDB Connection String (required)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lumora?retryWrites=true&w=majority

# Email Configuration (optional - for outreach functionality)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your-email@example.com
MAIL_PASSWORD=your-email-password

# Counseling Configuration (optional)
COUNSELING_INBOX=caps@example.edu
COUNSELING_CONTACTS_JSON='[{"name":"CSUF CAPS","phone":"+1-xxx-xxx-xxxx","email":"caps@csuf.edu","hours":"Mon–Fri 9–5","locationUrl":"https://..."}]'
EOF
    echo "✅ .env.local created!"
    echo ""
    echo "⚠️  Please update .env.local with your actual values:"
    echo "   - OPENAI_API_KEY: Your OpenAI API key"
    echo "   - MONGODB_URI: Your MongoDB connection string"
    echo ""
else
    echo "✅ .env.local already exists"
fi

echo "Environment setup complete!"
echo ""
echo "To run the development server:"
echo "  npm run dev"
