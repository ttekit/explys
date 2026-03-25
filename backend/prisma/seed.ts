import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const englishProficiencyTopics = {
  "english_proficiency_topics": {
    "foundational": [
      "Greetings",
      "Introductions",
      "Identification",
      "Alphabet",
      "Numbers",
      "Time",
      "Weather",
      "Directions",
      "Colors",
      "Family"
    ],
    "daily_life": [
      "Routines",
      "Housing",
      "Chores",
      "Food",
      "Cooking",
      "Shopping",
      "Clothing",
      "Commuting",
      "Transport",
      "Fitness"
    ],
    "social_emotional": [
      "Hobbies",
      "Feelings",
      "Health",
      "Appearance",
      "Personality",
      "Friendship",
      "Pets",
      "Jokes",
      "Compliments",
      "Apologies",
      "Gratitude",
      "Opinions",
      "Advice",
      "Invitations",
      "Plans"
    ],
    "leisure_culture": [
      "Movies",
      "Music",
      "Books",
      "Travel",
      "Holidays",
      "Sports",
      "Gaming",
      "Socializing",
      "Dining",
      "Hotels",
      "Nature",
      "Art",
      "Photography",
      "Internet",
      "Social-Media"
    ],
    "professional_academic": [
      "Jobs",
      "Workplace",
      "Meetings",
      "Interviews",
      "Education",
      "Skills",
      "Projects",
      "Goals",
      "Computers",
      "Emails",
      "Calls",
      "Presentations",
      "Feedback",
      "Deadlines",
      "Money"
    ],
    "abstract_complex": [
      "News",
      "Economy",
      "Environment",
      "Technology",
      "Politics",
      "History",
      "Science",
      "Ethics",
      "Memories",
      "Dreams",
      "Problems",
      "Negotiation",
      "Comparison",
      "Hypotheticals",
      "Philosophy"
    ],
    "situational": [
      "Emergencies",
      "Fixing",
      "Post-Office",
      "Banking",
      "Airport",
      "Library",
      "Gifts",
      "Appointments",
      "Driving",
      "Safety"
    ],
    "fluency_markers": [
      "Idioms",
      "Slang",
      "Emphasis",
      "Summarizing",
      "Clarification",
      "Transitions",
      "Style",
      "Persuasion",
      "Speculation",
      "Culture-Shock"
    ]
  }
};

async function main() {
  console.log('🌱 Starting seed...');

  const allTags: string[] = [];

  Object.values(englishProficiencyTopics.english_proficiency_topics).forEach((category: string[]) => {
    allTags.push(...category);
  });

  const uniqueTags = [...new Set(allTags)];

  console.log(`📝 Found ${uniqueTags.length} unique tags to seed`);

  const createdTags: { id: number; name: string }[] = [];
  for (const tagName of uniqueTags) {
    try {
      const tag = await prisma.tag.create({
        data: {
          name: tagName,
        },
      });
      createdTags.push(tag);
      console.log(`✅ Created tag: ${tagName}`);
    } catch (error) {
      console.log(`⚠️  Tag "${tagName}" might already exist, skipping...`);
    }
  }

  console.log(`🎉 Successfully seeded ${createdTags.length} tags!`);

  console.log('🏷️  Creating sample categories...');

  const categories = [
    { name: 'Foundational' },
    { name: 'Daily Life' },
    { name: 'Social & Emotional' },
    { name: 'Leisure & Culture' },
    { name: 'Professional & Academic' },
    { name: 'Abstract & Complex' },
    { name: 'Situational' },
    { name: 'Fluency Markers' },
  ];

  const createdCategories: { id: number; name: string }[] = [];
  for (const categoryData of categories) {
    try {
      const category = await prisma.category.create({
        data: categoryData,
      });
      createdCategories.push(category);
      console.log(`✅ Created category: ${categoryData.name}`);
    } catch (error) {
      console.log(`⚠️  Category "${categoryData.name}" might already exist, skipping...`);
    }
  }

  console.log(`🎉 Successfully seeded ${createdCategories.length} categories!`);

  console.log('🎭 Creating sample genres...');

  const genres = [
    { name: 'Action' },
    { name: 'Adventure' },
    { name: 'Comedy' },
    { name: 'Drama' },
    { name: 'Horror' },
    { name: 'Romance' },
    { name: 'Sci-Fi' },
    { name: 'Thriller' },
    { name: 'Fantasy' },
    { name: 'Mystery' },
  ];

  const createdGenres: { id: number; name: string }[] = [];
  for (const genreData of genres) {
    try {
      const genre = await prisma.genre.create({
        data: genreData,
      });
      createdGenres.push(genre);
      console.log(`✅ Created genre: ${genreData.name}`);
    } catch (error) {
      console.log(`⚠️  Genre "${genreData.name}" might already exist, skipping...`);
    }
  }

  console.log(`🎉 Successfully seeded ${createdGenres.length} genres!`);

  console.log('📚 Creating sample topic...');

  try {
    const sampleTopic = await prisma.topic.create({
      data: {
        name: 'Basic Greetings and Introductions',
        categoryId: 1,
        complexity: 1.0,
        language: 'en',
        tags: {
          connect: [
            { name: 'Greetings' },
            { name: 'Introductions' },
          ],
        },
      },
      include: {
        category: true,
        tags: true,
      },
    });
    console.log(`✅ Created sample topic: ${sampleTopic.name}`);
    console.log(`   - Category: ${sampleTopic.category.name}`);
    console.log(`   - Tags: ${sampleTopic.tags.map(t => t.name).join(', ')}`);
  } catch (error) {
    console.log('⚠️  Sample topic creation failed, might already exist or missing dependencies');
  }

  console.log('🌱 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
