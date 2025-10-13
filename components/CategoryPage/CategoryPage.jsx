"use client";

export default function CategoryPage({ title, description }) {
  return (
    <section>
      <h2>{title}</h2>
      <p>{description}</p>

      <div style={{ marginTop: "2rem" }}>
        <p style={{ opacity: 0.6 }}>
          (Articles will appear here soon — generated automatically.)
        </p>
      </div>
    </section>
  );
}
