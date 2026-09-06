import './globals.css';

export const metadata = {
  title: "Gemini Free — The Full-Stack AI Workspace",
  description: "Gemini Free is your ChatGPT-style conversational assistant for full-stack code, Firebase architectures, and interactive brainstorming.",
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M7 25L13.5 4.5L18 13.5L25 25C24.5 27.5 20.5 29 16 29C11.5 29 7.5 27.5 7 25Z" fill="%23ff9100"/></svg>',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body 
        suppressHydrationWarning
        className="bg-[#fafaf9] text-neutral-900 antialiased selection:bg-orange-200 selection:text-orange-900"
      >
        {children}
      </body>
    </html>
  );
}
