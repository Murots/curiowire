import {
  Wrapper,
  Headline,
  Paragraph,
  SectionTitle,
  List,
  ListItem,
} from "./sources.styles";

export const metadata = {
  title: "Sources & Methodology — CurioWire",
  description:
    "How CurioWire gathers, writes and illustrates stories using AI, open data and global archives. Learn about our editorial process, image sources and affiliate model.",
};

export default function SourcesPage() {
  return (
    <Wrapper>
      <Headline>Sources & Methodology</Headline>

      <Paragraph>
        <strong>CurioWire</strong> combines artificial intelligence, open
        archives, and automated editorial tools to curate stories from around
        the world. Transparency is essential — below you’ll find how we gather,
        write, and illustrate each story published on this platform.
      </Paragraph>

      <SectionTitle>1. Data & Information Sources</SectionTitle>
      <Paragraph>
        The foundation of each article comes from a combination of open data,
        research archives and reputable publications. Our automated systems use
        trusted feeds such as:
      </Paragraph>

      <List>
        <ListItem>• Public domain archives and library datasets</ListItem>
        <ListItem>
          • Scientific and academic repositories (e.g., arXiv, PLOS)
        </ListItem>
        <ListItem>
          • International press releases and verified RSS sources
        </ListItem>
        <ListItem>• Historical databases and museum digitizations</ListItem>
      </List>

      <Paragraph>
        Text generation and summarization are performed using{" "}
        <strong>OpenAI’s GPT models</strong> to identify patterns, translate
        complex data into readable language, and recreate the tone of a classic
        newsroom report. All AI outputs are reviewed for factual alignment and
        clarity before publication.
      </Paragraph>

      <SectionTitle>2. Image Sources</SectionTitle>
      <Paragraph>
        Visual material on CurioWire is produced through a blend of automated
        generation and curated selection:
      </Paragraph>

      <List>
        <ListItem>
          • <strong>Unsplash API</strong> — for editorial-safe stock photography
          and creative commons imagery
        </ListItem>
        <ListItem>
          • <strong>DALL·E & OpenAI Image Models</strong> — for custom
          AI-generated visuals accompanying conceptual stories
        </ListItem>
        <ListItem>• Historical or open-license archives when relevant</ListItem>
      </List>

      <Paragraph>
        Images are always reviewed for theme, tone and license compliance before
        being published. However, visual content may sometimes serve as an
        artistic interpretation rather than a literal depiction of events.
      </Paragraph>

      <SectionTitle>3. Product & Affiliate Content</SectionTitle>
      <Paragraph>
        Articles in the <strong>Products</strong> category may contain links to
        online marketplaces such as{" "}
        <a
          href="https://www.amazon.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Amazon
        </a>
        . These links are generated dynamically using open product data.{" "}
        <strong>CurioWire</strong> participates in the{" "}
        <strong>Amazon Associates Program</strong>, which means we may earn a
        small commission from qualifying purchases — at no additional cost to
        the reader.
      </Paragraph>

      <Paragraph>
        This model helps support hosting and continued platform development
        while maintaining a clean, ad-minimal reading experience.
      </Paragraph>

      <SectionTitle>4. Platform & Technology</SectionTitle>
      <Paragraph>
        CurioWire is built with <strong>Next.js</strong> and{" "}
        <strong>React</strong>, powered by{" "}
        <a
          href="https://supabase.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Supabase
        </a>{" "}
        for data storage and analytics. The site is hosted via{" "}
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">
          Vercel
        </a>
        , with Cloudflare managing DNS and email routing.
      </Paragraph>

      <Paragraph>
        Automated content pipelines run continuously in the background, ensuring
        new stories are published daily without manual intervention.
      </Paragraph>
    </Wrapper>
  );
}
