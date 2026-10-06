# Smart Assistant Pro

Create a powerful AI chatbot called "Smart Calculator Pro AI" and integrate it into my Smart Calculator Pro app.



The chatbot should have a modern premium ChatGPT-style interface, optimized for Android mobile and desktop.



MAIN AI FEATURES:

1. Answer general questions on almost any topic.

2. Give detailed explanations when the user asks for detail.

3. Understand English, Urdu, and Roman Urdu.

4. Solve mathematical problems step-by-step.

5. Explain calculations in simple language.

6. Handle equations, percentages, algebra, geometry, unit conversions, dates, time and finance calculations.

7. Never invent an answer when information is uncertain. Clearly say when something cannot be verified.



IMAGE ANALYSIS:

Add image understanding directly inside the chat.

Users can:

- Take a photo with Camera

- Select an image from Gallery

- Upload screenshots

- Upload handwritten notes

- Upload mathematical questions

- Upload documents/images containing text

- Upload charts, tables and diagrams



When an image is uploaded:

- Analyze the entire image.

- Read visible text.

- Understand handwriting as accurately as possible.

- Extract mathematical questions.

- Understand charts and tables.

- Solve questions shown in the image.

- Tell the user what was detected before giving the answer.

- If some text is unclear, mark it as "(?)" instead of making it up.



CHAT + FILE FEATURES:

Allow users to upload common files such as:

PDF, TXT, DOCX, CSV, images and other supported documents.



The AI should be able to:

- Read uploaded files

- Summarize files

- Answer questions about files

- Extract important information

- Analyze tables

- Analyze documents

- Generate useful files when requested



FILE GENERATION:

If the user asks for a file, generate it when technically supported.



Examples:

"Make this into a PDF"

"Create a TXT file"

"Create a CSV"

"Create a report"

"Make a study notes file"



Show a clear Download button for generated files.



CHAT UI:

Create:

- New Chat

- Chat History

- Search Chats

- Rename Chat

- Pin Chat

- Favorite Chat

- Export as TXT

- Export as PDF

- Copy Conversation

- Share Conversation

- Clear Conversation

- Delete All Chats



Keep chat history persistent using appropriate browser/app storage or backend database.



PLUS (+) MENU:

The + button beside the message box should open:



📷 Camera

🖼️ Gallery

🧾 Scan

✍️ Write

🎨 Draw

🎙️ Voice



CAMERA:

Open device camera and allow the user to capture an image, then analyze it.



GALLERY:

Allow image selection and AI analysis.



SCAN:

Allow scanning a document/question and extract its contents.



WRITE:

Open a writing pad where the user can write with touch/mouse.

Analyze the handwriting after pressing "Read".



DRAW:

Open a full-screen drawing canvas with:

- Pen

- Eraser

- Undo

- Clear

- Read/Analyze button



VOICE:

Allow voice input using the device microphone and convert speech to text before sending it to AI.



SMART CALCULATOR INTEGRATION:

The AI must understand and use the calculator tools already available in my app.



Available tools/features include:

- Basic Calculator

- Scientific Calculator

- Unit Converter

- Currency Converter

- Percentage Calculator

- Age Calculator

- BMI Calculator

- Discount Calculator

- Profit Calculator

- EMI / Loan Calculator

- GST / Tax Calculator

- Date & Time Calculator

- Time Zone Converter

- Calculator Tools

- AI Chat

- Draw Pad



If a question can be solved accurately using one of these calculators, use the corresponding calculator logic instead of guessing.



Examples:

User: "Calculate 15% of 850"

→ Use percentage calculation.



User: "BMI for 70kg and 175cm"

→ Use BMI calculation.



User: "What is my EMI for 500000?"

→ Use EMI calculator.



User: "Convert 10 USD to PKR"

→ Use currency converter/current exchange-rate source when online.



User: "How old am I if I was born on..."

→ Use Age Calculator.



SMART AUTO AI:

Add an "Auto AI" mode.



Priority:

1. Use built-in calculator/local logic when possible.

2. Use local AI when available.

3. If local AI cannot answer and internet is available, automatically use the configured online AI provider.

4. Do not ask the user for an API key.



AI PROVIDER SETTINGS:

Create an AI Provider section in Settings with:



AI 1 — Claude

AI 2 — ChatGPT

AI 3 — Gemini

Auto AI



The user can select a preferred provider.



IMPORTANT SECURITY:

Never expose API keys inside frontend HTML/JavaScript.

Use a secure backend/serverless function for online AI requests.

Store provider credentials only in secure server-side environment variables.

Users must never be required to enter provider API keys.



OFFLINE AI:

Support downloadable local AI models:

- Small AI

- Large AI



Add buttons:

"Download Small AI"

"Download Large AI"



After a model is downloaded and cached, allow the app to use it offline where the device/browser supports local inference.



Clearly show:

Downloading...

Preparing AI...

Ready Offline

Offline AI unavailable

Internet AI active



Do not falsely claim that a hosted AI model is completely free or unlimited.



MESSAGE INPUT:

The message box should:

- Expand upward while typing

- Have Send button

- Support Enter to send

- Support multiline text

- Show image/file attachments

- Show loading/typing indicator

- Allow stopping generation

- Allow copying AI responses



AI RESPONSE UI:

Make responses clean and readable.



Support:

- Markdown

- Headings

- Bold/italic

- Bullet lists

- Numbered lists

- Code blocks

- Mathematical expressions

- Tables

- Copy button

- Regenerate button



For calculations, show:

Question

Formula

Steps

Answer



DESIGN:

Use a premium modern dark UI matching the existing Smart Calculator Pro design.



Keep:

- Rounded cards

- Smooth animations

- Mobile-first layout

- Bottom chat input

- Clean typography

- Dark/light mode

- Responsive desktop layout



Do not remove any existing Smart Calculator Pro calculator features.



IMPORTANT:

Build this as a real working application, not just a visual mockup.

Keep the architecture modular so AI providers, local models, file processing, image analysis and calculator tools can be changed later.

Use secure backend APIs for online AI.

Use local processing whenever possible for privacy and offline operation.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/0e386bb2-e8a9-5452-a590-013318e10543).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
