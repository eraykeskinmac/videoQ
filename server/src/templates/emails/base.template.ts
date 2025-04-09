export interface EmailTemplateContent {
  title: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
}

export const baseEmailTemplate = (content: EmailTemplateContent): string => {
  const buttonSection =
    content.buttonText && content.buttonUrl
      ? `
        <div class="button-container">
          <a href="${content.buttonUrl}" class="button">${content.buttonText}</a>
        </div>
        
        <div class="link-container">
          <p class="link-text">Or copy this URL:</p>
          <a href="${content.buttonUrl}" class="link">${content.buttonUrl}</a>
        </div>
      `
      : "";

  return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${content.title}</title>
          <style>
            /* Modern Reset */
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              -webkit-font-smoothing: antialiased;
              background-color: #f5f5f5;
            }
    
            /* Container */
            .container {
              max-width: 600px;
              margin: 0 auto;
              background-color: #ffffff;
              border-radius: 16px;
              box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
              overflow: hidden;
            }
    
            /* Header */
            .header {
              background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
              padding: 40px 20px;
              text-align: center;
              position: relative;
            }
    
            .header::after {
              content: '';
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 40px;
              background: linear-gradient(to bottom right, transparent 49%, #ffffff 50%);
            }
    
            .header h1 {
              color: #ffffff;
              font-size: 28px;
              font-weight: 800;
              margin: 0;
              letter-spacing: -0.5px;
            }
    
            .logo {
              width: 80px;
              height: 80px;
              margin-bottom: 20px;
              border-radius: 16px;
              background: rgba(255, 255, 255, 0.1);
              backdrop-filter: blur(10px);
              padding: 15px;
            }
    
            /* Content */
            .content {
              padding: 40px 30px;
            }
    
            .content h1 {
              color: #1a1a1a;
              font-size: 24px;
              font-weight: 700;
              margin-bottom: 24px;
              text-align: center;
            }
    
            .content p {
              color: #4b5563;
              font-size: 16px;
              margin-bottom: 20px;
              line-height: 1.7;
            }
    
            /* Feature Card */
            .feature-card {
              background: #f8fafc;
              border-radius: 12px;
              padding: 24px;
              margin: 24px 0;
              border: 1px solid #e2e8f0;
            }
    
            /* Button */
            .button-container {
              text-align: center;
              margin: 32px 0 24px;
            }
    
            .button {
              display: inline-block;
              background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
              color: #ffffff !important;
              padding: 16px 32px;
              border-radius: 12px;
              text-decoration: none;
              font-weight: 700;
              font-size: 16px;
              transition: all 0.3s ease;
              box-shadow: 0 4px 6px rgba(79, 70, 229, 0.2);
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
              letter-spacing: 0.3px;
            }
    
            .button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 8px rgba(79, 70, 229, 0.25);
              background: linear-gradient(135deg, #4338CA 0%, #6D28D9 100%);
            }
    
            /* Link */
            .link-container {
              text-align: center;
              background: #f8fafc;
              border-radius: 8px;
              padding: 12px;
              margin-top: 16px;
            }
    
            .link-text {
              font-size: 14px;
              color: #6b7280;
              margin-bottom: 8px !important;
            }
    
            .link {
              word-break: break-all;
              color: #4F46E5;
              text-decoration: none;
              font-size: 14px;
              border-bottom: 1px dashed #4F46E5;
            }
    
            /* Footer */
            .footer {
              text-align: center;
              padding: 32px 20px;
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
            }
    
            .footer p {
              color: #6b7280;
              font-size: 14px;
              margin-bottom: 8px;
            }
    
            .social-links {
              margin-top: 20px;
            }
    
            .social-link {
              display: inline-block;
              margin: 0 8px;
              color: #4F46E5;
              text-decoration: none;
              font-size: 14px;
            }
    
            /* Responsive */
            @media screen and (max-width: 600px) {
              .container {
                border-radius: 0;
              }
              
              .content {
                padding: 30px 20px;
              }
    
              .header h1 {
                font-size: 24px;
              }
    
              .button {
                padding: 14px 28px;
              }
            }
          </style>
        </head>
        <body style="padding: 20px;">
          <div class="container">
            <div class="header">
              <div class="logo">
                <svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L3 8L12 12L21 8L12 4Z" />
                  <path d="M3 14L12 18L21 14" opacity="0.6" />
                  <path d="M3 10L12 14L21 10" opacity="0.8" />
                </svg>
              </div>
              <h1>AI Video Summarizer</h1>
            </div>
            
            <div class="content">
              <h1>${content.title}</h1>
              ${content.body}
              ${buttonSection}
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} AI Video Summarizer. All rights reserved.</p>
              <p>If you didn't request this email, please ignore it.</p>
              <div class="social-links">
                <a href="#" class="social-link">Twitter</a>
                <a href="#" class="social-link">LinkedIn</a>
                <a href="#" class="social-link">GitHub</a>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;
};
