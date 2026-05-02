-- Many-to-many between ContentStats and Tag (Prisma implicit join)
CREATE TABLE "_ContentStatsToTag" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_ContentStatsToTag_AB_pkey" PRIMARY KEY ("A", "B")
);

CREATE INDEX "_ContentStatsToTag_B_index" ON "_ContentStatsToTag"("B");

ALTER TABLE "_ContentStatsToTag" ADD CONSTRAINT "_ContentStatsToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "content_stats"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "_ContentStatsToTag" ADD CONSTRAINT "_ContentStatsToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
