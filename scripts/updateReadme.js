const fs = require("fs");
const prettier = require("prettier");

const HASHNODE_API_URL = "https://gql.hashnode.com";
const HASHNODE_HOST = "ijlalahmad.hashnode.dev";

// GraphQL Query to fetch blog metadata
const query = `
  query SearchPostsOfPublication {
    publication(host: "${HASHNODE_HOST}") {
      posts(first: 4) {
        edges {
          node {
            title
            url
            coverImage {
              url
            }
            seo {
              description
            }
            readTimeInMinutes
          }
        }
      }
    }
  }
`;

// Fetch blogs from Hashnode
async function fetchBlogs() {
  const response = await fetch(HASHNODE_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const data = await response.json();
  return data.data.publication.posts.edges.map((edge) => edge.node);
}

// Generate blogs Markdown table
function generateBlogsMarkdown(blogs) {
  const tableHeader = `
| Cover Image | Info |
| --- | --- |`;

  const tableRows = blogs
    .map(
      (blog) => `
| <img src="${blog.coverImage.url}" alt="${blog.title}" style="width: 400px; height: auto; border-radius: 8px;" /> | **[${blog.title}](${blog.url})** <br><br> ${blog.seo.description} <br><br> ⏱️ ${blog.readTimeInMinutes} min read |`
    )
    .join("");

  return `${tableHeader}${tableRows}`;
}

// Update README
async function updateReadme() {
  const blogs = await fetchBlogs();
  const blogsMarkdown = generateBlogsMarkdown(blogs);

  // Read the current README
  const readme = fs.readFileSync("README.md", "utf-8");

  // Replace the blogs section
  const updatedReadme = readme.replace(
    /<!-- BLOGS:START -->[\s\S]*<!-- BLOGS:END -->/,
    `<!-- BLOGS:START -->\n${blogsMarkdown}\n<!-- BLOGS:END -->`
  );

  // Format and write the updated README
  const formattedReadme = await prettier.format(updatedReadme, {
    parser: "markdown",
  });
  fs.writeFileSync("README.md", formattedReadme);
}

updateReadme().catch((err) => {
  console.error(err);
  process.exit(1);
});
