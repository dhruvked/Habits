// Provide a fake DATABASE_URL so @/lib/db doesn't throw during import
process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
