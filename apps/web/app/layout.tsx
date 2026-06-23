import Providers from './providers';
import '../styles/globals.css';

export const metadata = {
  title: 'Social Olympics',
  description: 'Create and compete in custom Olympic-style competitions',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
