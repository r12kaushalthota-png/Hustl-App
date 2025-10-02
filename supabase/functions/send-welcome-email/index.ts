import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface WelcomeEmailRequest {
  email: string;
  fullName?: string;
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const generateWelcomeEmailHTML = (fullName?: string) => {
  const name = fullName || 'Gator';
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Hustl</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, #0021A5 0%, #FA4616 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .logo {
      width: 120px;
      height: 120px;
      margin: 0 auto 20px;
      background-color: #ffffff;
      border-radius: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .logo-text {
      font-size: 48px;
      font-weight: 800;
      color: #0021A5;
      letter-spacing: -1px;
    }
    .header-title {
      color: #ffffff;
      font-size: 32px;
      font-weight: 700;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 24px;
      font-weight: 600;
      color: #1a1a1a;
      margin: 0 0 20px 0;
    }
    .message {
      font-size: 16px;
      line-height: 1.6;
      color: #4a4a4a;
      margin: 0 0 30px 0;
    }
    .feature-box {
      background: linear-gradient(135deg, #f8f9ff 0%, #fff5f5 100%);
      border-radius: 12px;
      padding: 24px;
      margin: 24px 0;
      border-left: 4px solid #0021A5;
    }
    .feature-title {
      font-size: 18px;
      font-weight: 600;
      color: #0021A5;
      margin: 0 0 12px 0;
    }
    .feature-list {
      margin: 0;
      padding-left: 20px;
    }
    .feature-list li {
      font-size: 15px;
      line-height: 1.8;
      color: #4a4a4a;
      margin-bottom: 8px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #0021A5 0%, #FA4616 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      margin: 20px 0;
      box-shadow: 0 4px 12px rgba(0, 33, 165, 0.3);
    }
    .footer {
      background-color: #f8f9fa;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e0e0e0;
    }
    .footer-text {
      font-size: 14px;
      color: #6b7280;
      margin: 8px 0;
    }
    .footer-link {
      color: #0021A5;
      text-decoration: none;
    }
    .social-links {
      margin: 20px 0;
    }
    .social-link {
      display: inline-block;
      margin: 0 10px;
      color: #6b7280;
      text-decoration: none;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <span class="logo-text">H</span>
      </div>
      <h1 class="header-title">Welcome to Hustl!</h1>
    </div>
    
    <div class="content">
      <p class="greeting">Hey ${name}! 🎉</p>
      
      <p class="message">
        Welcome to the Gator Nation's favorite campus task marketplace! We're thrilled to have you join our community of ambitious students helping each other get things done.
      </p>
      
      <p class="message">
        Whether you're looking to earn extra cash by completing tasks or need help with your daily to-dos, Hustl makes it easy to connect with fellow Gators.
      </p>
      
      <div class="feature-box">
        <h2 class="feature-title">🚀 Get Started in 3 Easy Steps:</h2>
        <ul class="feature-list">
          <li><strong>Browse Tasks:</strong> Check out what fellow students need help with</li>
          <li><strong>Accept & Earn:</strong> Complete tasks and get paid instantly</li>
          <li><strong>Post Your Own:</strong> Need something done? Post a task and get help fast</li>
        </ul>
      </div>
      
      <div class="feature-box">
        <h2 class="feature-title">💰 Why Hustl?</h2>
        <ul class="feature-list">
          <li>Fast, secure payments through Stripe</li>
          <li>Build your reputation with reviews and ratings</li>
          <li>Connect with verified UF students only</li>
          <li>Flexible - work on your own schedule</li>
        </ul>
      </div>
      
      <center>
        <a href="hustl://" class="cta-button">Open Hustl App</a>
      </center>
      
      <p class="message">
        Questions? We're here to help! Reach out to our support team anytime.
      </p>
      
      <p class="message">
        <strong>Go Gators! 🐊</strong><br>
        The Hustl Team
      </p>
    </div>
    
    <div class="footer">
      <p class="footer-text">
        <strong>Hustl</strong> - Campus Task Marketplace for UF Students
      </p>
      <p class="footer-text">
        University of Florida | Gainesville, FL
      </p>
      <div class="social-links">
        <a href="#" class="social-link">Instagram</a>
        <a href="#" class="social-link">Twitter</a>
        <a href="#" class="social-link">Support</a>
      </div>
      <p class="footer-text" style="font-size: 12px; color: #9ca3af; margin-top: 20px;">
        You're receiving this email because you signed up for Hustl.<br>
        © 2025 Hustl. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `;
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { email, fullName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    if (RESEND_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'Hustl <welcome@hustlapp.com>',
          to: [email],
          subject: 'Welcome to Hustl - Let\'s Get Started! 🎉',
          html: generateWelcomeEmailHTML(fullName),
        }),
      });

      if (!res.ok) {
        const errorData = await res.text();
        console.error('Resend API error:', errorData);
        throw new Error(`Failed to send email: ${errorData}`);
      }

      const data = await res.json();
      console.log('Welcome email sent successfully:', data);

      return new Response(
        JSON.stringify({ success: true, messageId: data.id }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } else {
      console.log('RESEND_API_KEY not configured. Email would be sent to:', email);
      console.log('Preview HTML in logs');
      console.log(generateWelcomeEmailHTML(fullName));
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Email service not configured (development mode)',
          preview: true 
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send welcome email' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});