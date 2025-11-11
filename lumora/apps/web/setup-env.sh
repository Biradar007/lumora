#!/bin/bash

echo "Setting up environment for Lumora..."
echo ""

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "Creating .env.local file..."
    cat > .env.local << EOF
# OpenAI API Key (required)
OPENAI_API_KEY=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

# Email Configuration (optional - for outreach functionality)
MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=your-lumoraahelp@gmail.com
MAIL_PASSWORD=your-email-password

# Counseling Configuration (optional)
COUNSELING_INBOX=caps@example.edu
COUNSELING_CONTACTS_JSON='[{"name":"CSUF CAPS","phone":"+1-(657) 278-3040","email":"caps@csuf.edu","hours":"Mon–Fri 8:00 AM–5:00 PM","location":"Titan Hall 1st & 3rd Floor
1111 N. State College Blvd"}]'

# Google Calendar Integration (required for calendar sync)
GOOGLE_CLIENT_ID=136249787281-k7gms7o44ijn1q3sqd9hrmdov08idfd4.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_CALENDAR_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Zoom Server-to-Server OAuth (for video sessions)
ZOOM_ACCOUNT_ID=0bO_tMNjTjKNTAVRTPacNw
ZOOM_CLIENT_ID=F4fQ1pNXTba3mpkFC2Id_A
ZOOM_CLIENT_SECRET=AFBqdkqU7dZ6oZj7w0AeibO0WguJaArL
EOF
    echo "✅ .env.local created!"
    echo ""
    echo "⚠️  Please update .env.local with your actual values:"
    echo "   - OPENAI_API_KEY: Your OpenAI API key"
    echo "   - MONGODB_URI: Your MongoDB connection string"
    echo "   - GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET: OAuth credentials for Calendar sync"
    echo "   - GOOGLE_CALENDAR_REDIRECT_URI: OAuth callback URL (matches Google console)"
    echo "   - NEXT_PUBLIC_APP_URL: Base URL for the web app"
    echo "   - ZOOM_ACCOUNT_ID / ZOOM_CLIENT_ID / ZOOM_CLIENT_SECRET: Server-to-server OAuth credentials"
    echo ""
else
    echo "✅ .env.local already exists"
fi

echo "Environment setup complete!"
echo ""
echo "To run the development server:"
echo "  npm run dev"
