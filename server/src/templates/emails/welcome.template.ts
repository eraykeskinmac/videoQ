import { baseEmailTemplate } from "./base.template";

export const welcomeEmailTemplate = (name: string): string => {
  return baseEmailTemplate({
    title: "Unlock the Power of AI video analysis",
    body: `
        <h2>Welcome ${name}!</h2>
        <p>Thank you for joining our cutting-edge AI video analysis platform. We're thrilled to have you on board!</p>
        
        <h3>What You Can Do With Our Platform:</h3>
        <ul>
          <li><strong>Instant Summaries:</strong> Upload any video and get concise, accurate summaries in seconds</li>
          <li><strong>Key Insights:</strong> Extract the most important points and ideas automatically</li>
          <li><strong>Transcription:</strong> Convert spoken content to searchable text with high accuracy</li>
          <li><strong>Content Analysis:</strong> Identify topics, sentiments, and key moments</li>
          <li><strong>Custom Exports:</strong> Save results in various formats for your convenience</li>
        </ul>
        
        <h3>Getting Started is Easy:</h3>
        <ol>
          <li>Navigate to your personal dashboard</li>
          <li>Upload your first video file (we support all major formats)</li>
          <li>Select your preferred analysis options</li>
          <li>Receive detailed results within minutes</li>
        </ol>
        
        <p>Our advanced AI algorithms work tirelessly to provide you with the most accurate and useful analysis of your video content. Whether you're a content creator, educator, marketer, or researcher, our platform is designed to save you time and uncover insights you might miss.</p>
        
        <p>If you have any questions or need assistance, our support team is available 24/7 to help you make the most of your experience.</p>
        
        <p>Ready to revolutionize the way you work with video?</p>
        `,
    buttonText: "Start Your AI Journey Now",
    buttonUrl: "/dashboard",
  });
};
