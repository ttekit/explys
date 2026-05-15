import "dotenv/config";
import * as bcrypt from "bcrypt";
import { AuthMethod, PrismaClient, UserRole } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { getDatabaseUrl } from "../src/config/database-url";

/** Dev-only credentials; override with SEED_TEMP_ADMIN_EMAIL / SEED_TEMP_ADMIN_PASSWORD. */
const TEMP_ADMIN_EMAIL_DEFAULT = "temp-admin@localhost.local";
const TEMP_ADMIN_PASSWORD_DEFAULT = "TempAdmin1!";

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: false,
});
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

// 📚 Expanded English Proficiency Topics & Tags
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
      "Family",
      "Shapes",
      "Prepositions",
      "Pronouns",
      "Measurement"
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
      "Fitness",
      "Parenting",
      "Gardening",
      "Groceries",
      "Delivery",
      "Home-Maintenance"
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
      "Plans",
      "Dating",
      "Empathy",
      "Conflicts",
      "Boundaries",
      "Moods"
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
      "Social-Media",
      "Theater",
      "Festivals",
      "Concerts",
      "Streaming",
      "Architecture"
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
      "Money",
      "Leadership",
      "Networking",
      "Remote-Work",
      "Startups",
      "Resumes"
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
      "Philosophy",
      "Globalization",
      "Artificial-Intelligence",
      "Human-Rights",
      "Climate-Change",
      "Psychology"
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
      "Safety",
      "Hospital",
      "Police",
      "Pharmacy",
      "Customs",
      "Vet"
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
      "Culture-Shock",
      "Phrasal-Verbs",
      "Collocations",
      "Proverbs",
      "Politeness",
      "Hedging"
    ]
  }
};

async function main() {
  console.log('🌱 Starting seed...');

  const tempAdminEmail = (
    process.env.SEED_TEMP_ADMIN_EMAIL ?? TEMP_ADMIN_EMAIL_DEFAULT
  ).toLowerCase();
  const tempAdminPassword =
    process.env.SEED_TEMP_ADMIN_PASSWORD ?? TEMP_ADMIN_PASSWORD_DEFAULT;
  const tempAdminHash = await bcrypt.hash(tempAdminPassword, 10);
  await prisma.user.upsert({
    where: { email: tempAdminEmail },
    create: {
      email: tempAdminEmail,
      name: "Temp Admin",
      password: tempAdminHash,
      role: UserRole.ADMIN,
      method: AuthMethod.CREDENTIALS,
      isVerified: true,
      hasCompletedPlacement: true,
      isTwoFactorEnable: false,
      isSuspended: false,
    },
    update: {
      name: "Temp Admin",
      password: tempAdminHash,
      role: UserRole.ADMIN,
      method: AuthMethod.CREDENTIALS,
      isVerified: true,
      hasCompletedPlacement: true,
      isTwoFactorEnable: false,
      isSuspended: false,
    },
  });
  console.log(
    "👤 Temp admin upserted:",
    tempAdminEmail,
    "(set SEED_TEMP_ADMIN_EMAIL / SEED_TEMP_ADMIN_PASSWORD to override; remove or rotate before production)",
  );

  // --- 1. SEED TAGS ---
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
        data: { name: tagName },
      });
      createdTags.push(tag);
      console.log(`✅ Created tag: ${tagName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Tag "${tagName}" might already exist, skipping... (${message})`);
    }
  }
  console.log(`🎉 Successfully seeded ${createdTags.length} tags!`);

  // --- 2. SEED CATEGORIES ---
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
      const message = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Category "${categoryData.name}" might already exist, skipping... (${message})`);
    }
  }
  console.log(`🎉 Successfully seeded ${createdCategories.length} categories!`);

  // --- 3. SEED GENRES (Expanded) ---
  console.log('🎭 Creating sample genres...');
  const genres = [
    { name: 'Action' },
    { name: 'Adventure' },
    { name: 'Animation' }, // New
    { name: 'Comedy' },
    { name: 'Crime' },     // New
    { name: 'Documentary' },// New
    { name: 'Drama' },
    { name: 'Family' },    // New
    { name: 'Fantasy' },
    { name: 'History' },   // New
    { name: 'Horror' },
    { name: 'Musical' },   // New
    { name: 'Mystery' },
    { name: 'Noir' },      // New
    { name: 'Romance' },
    { name: 'Sci-Fi' },
    { name: 'Sports' },    // New
    { name: 'Thriller' },
    { name: 'War' },       // New
    { name: 'Western' },   // New
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
      const message = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Genre "${genreData.name}" might already exist, skipping... (${message})`);
    }
  }
  console.log(`🎉 Successfully seeded ${createdGenres.length} genres!`);

  // --- 4. SEED TOPICS (Expanded Templates) ---
  console.log('📚 Creating sample topics...');
  const categoryByName = new Map<string, { id: number; name: string }>();
  const allExistingCategories = await prisma.category.findMany();
  for (const category of allExistingCategories) {
    categoryByName.set(category.name, category);
  }

  const topicTemplates: Array<{
    name: string;
    categoryName: string;
    complexity: number;
    language: string;
    tagNames: string[];
  }> = [
    // Original Templates
    { name: 'Basic Greetings and Introductions', categoryName: 'Foundational', complexity: 1, language: 'en', tagNames: ['Greetings', 'Introductions'] },
    { name: 'Numbers, Time and Directions', categoryName: 'Foundational', complexity: 1.1, language: 'en', tagNames: ['Numbers', 'Time', 'Directions'] },
    { name: 'Family and Daily Communication', categoryName: 'Foundational', complexity: 1.2, language: 'en', tagNames: ['Family', 'Identification'] },
    { name: 'Home and Daily Routines', categoryName: 'Daily Life', complexity: 1.3, language: 'en', tagNames: ['Routines', 'Housing', 'Chores'] },
    { name: 'Food, Cooking and Shopping', categoryName: 'Daily Life', complexity: 1.4, language: 'en', tagNames: ['Food', 'Cooking', 'Shopping'] },
    { name: 'Transport and Commuting Basics', categoryName: 'Daily Life', complexity: 1.5, language: 'en', tagNames: ['Commuting', 'Transport', 'Directions'] },
    { name: 'Feelings and Relationships', categoryName: 'Social & Emotional', complexity: 1.6, language: 'en', tagNames: ['Feelings', 'Friendship', 'Personality'] },
    { name: 'Giving Advice and Opinions', categoryName: 'Social & Emotional', complexity: 1.8, language: 'en', tagNames: ['Advice', 'Opinions', 'Plans'] },
    { name: 'Invitations, Compliments and Apologies', categoryName: 'Social & Emotional', complexity: 1.7, language: 'en', tagNames: ['Invitations', 'Compliments', 'Apologies'] },
    { name: 'Travel and Hotel Conversations', categoryName: 'Leisure & Culture', complexity: 1.9, language: 'en', tagNames: ['Travel', 'Hotels', 'Holidays'] },
    { name: 'Movies, Music and Books Discussion', categoryName: 'Leisure & Culture', complexity: 2, language: 'en', tagNames: ['Movies', 'Music', 'Books'] },
    { name: 'Art, Nature and Photography Talk', categoryName: 'Leisure & Culture', complexity: 2.1, language: 'en', tagNames: ['Art', 'Nature', 'Photography'] },
    { name: 'Meetings and Workplace Communication', categoryName: 'Professional & Academic', complexity: 2.2, language: 'en', tagNames: ['Meetings', 'Workplace', 'Emails'] },
    { name: 'Interviews and Career Growth', categoryName: 'Professional & Academic', complexity: 2.3, language: 'en', tagNames: ['Interviews', 'Jobs', 'Skills'] },
    { name: 'Projects, Deadlines and Feedback', categoryName: 'Professional & Academic', complexity: 2.4, language: 'en', tagNames: ['Projects', 'Deadlines', 'Feedback'] },
    { name: 'Technology and Science Debates', categoryName: 'Abstract & Complex', complexity: 2.6, language: 'en', tagNames: ['Technology', 'Science', 'Comparison'] },
    { name: 'Ethics, Politics and Society', categoryName: 'Abstract & Complex', complexity: 2.8, language: 'en', tagNames: ['Ethics', 'Politics', 'News'] },
    { name: 'Hypotheticals and Negotiation Skills', categoryName: 'Abstract & Complex', complexity: 2.9, language: 'en', tagNames: ['Hypotheticals', 'Negotiation', 'Problems'] },
    { name: 'Airport and Emergency Situations', categoryName: 'Situational', complexity: 2.1, language: 'en', tagNames: ['Airport', 'Emergencies', 'Safety'] },
    { name: 'Banking, Appointments and Post Office', categoryName: 'Situational', complexity: 2, language: 'en', tagNames: ['Banking', 'Appointments', 'Post-Office'] },
    { name: 'Idioms and Slang in Context', categoryName: 'Fluency Markers', complexity: 3, language: 'en', tagNames: ['Idioms', 'Slang', 'Culture-Shock'] },
    { name: 'Persuasion and Emphasis Techniques', categoryName: 'Fluency Markers', complexity: 3.1, language: 'en', tagNames: ['Persuasion', 'Emphasis', 'Style'] },
    { name: 'Transitions, Clarification and Summarizing', categoryName: 'Fluency Markers', complexity: 2.7, language: 'en', tagNames: ['Transitions', 'Clarification', 'Summarizing'] },

    // New Expanded Templates
    { name: 'Shapes, Colors, and Describing Objects', categoryName: 'Foundational', complexity: 1.1, language: 'en', tagNames: ['Shapes', 'Colors', 'Measurement'] },
    { name: 'Using Prepositions and Pronouns Correctly', categoryName: 'Foundational', complexity: 1.2, language: 'en', tagNames: ['Prepositions', 'Pronouns', 'Identification'] },
    { name: 'Parenting and Household Management', categoryName: 'Daily Life', complexity: 1.6, language: 'en', tagNames: ['Parenting', 'Chores', 'Home-Maintenance'] },
    { name: 'Groceries, Gardening, and Home Deliveries', categoryName: 'Daily Life', complexity: 1.5, language: 'en', tagNames: ['Groceries', 'Gardening', 'Delivery'] },
    { name: 'Dating, Boundaries, and Interpersonal Conflict', categoryName: 'Social & Emotional', complexity: 2.2, language: 'en', tagNames: ['Dating', 'Boundaries', 'Conflicts'] },
    { name: 'Expressing Moods and Practicing Empathy', categoryName: 'Social & Emotional', complexity: 2.0, language: 'en', tagNames: ['Moods', 'Empathy', 'Feelings'] },
    { name: 'Theater, Concerts, and Festivals', categoryName: 'Leisure & Culture', complexity: 2.1, language: 'en', tagNames: ['Theater', 'Concerts', 'Festivals'] },
    { name: 'Streaming Services and Modern Media', categoryName: 'Leisure & Culture', complexity: 2.2, language: 'en', tagNames: ['Streaming', 'Internet', 'Social-Media'] },
    { name: 'Writing Resumes and Professional Networking', categoryName: 'Professional & Academic', complexity: 2.5, language: 'en', tagNames: ['Resumes', 'Networking', 'Jobs'] },
    { name: 'Leadership and Managing Remote Teams', categoryName: 'Professional & Academic', complexity: 2.7, language: 'en', tagNames: ['Leadership', 'Remote-Work', 'Workplace'] },
    { name: 'Startup Culture and Scaling Businesses', categoryName: 'Professional & Academic', complexity: 2.8, language: 'en', tagNames: ['Startups', 'Money', 'Projects'] },
    { name: 'Artificial Intelligence and Future Technology', categoryName: 'Abstract & Complex', complexity: 3.2, language: 'en', tagNames: ['Artificial-Intelligence', 'Technology', 'Ethics'] },
    { name: 'Climate Change, Globalization, and Human Rights', categoryName: 'Abstract & Complex', complexity: 3.3, language: 'en', tagNames: ['Climate-Change', 'Globalization', 'Human-Rights'] },
    { name: 'Navigating Hospitals, Police, and Pharmacies', categoryName: 'Situational', complexity: 2.3, language: 'en', tagNames: ['Hospital', 'Police', 'Pharmacy'] },
    { name: 'Mastering Phrasal Verbs and Collocations', categoryName: 'Fluency Markers', complexity: 3.1, language: 'en', tagNames: ['Phrasal-Verbs', 'Collocations', 'Style'] },
    { name: 'Politeness, Hedging, and Common Proverbs', categoryName: 'Fluency Markers', complexity: 3.0, language: 'en', tagNames: ['Politeness', 'Hedging', 'Proverbs'] }
  ];

  let createdTopicsCount = 0;
  for (const topicTemplate of topicTemplates) {
    const category = categoryByName.get(topicTemplate.categoryName);
    if (!category) {
      console.log(`⚠️  Category "${topicTemplate.categoryName}" not found, skipping topic "${topicTemplate.name}"`);
      continue;
    }

    try {
      const topic = await prisma.topic.create({
        data: {
          name: topicTemplate.name,
          categoryId: category.id,
          complexity: topicTemplate.complexity,
          language: topicTemplate.language,
          tags: {
            connect: topicTemplate.tagNames.map((name) => ({ name })),
          },
        },
      });
      createdTopicsCount += 1;
      console.log(`✅ Created topic: ${topic.name}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`⚠️  Topic "${topicTemplate.name}" might already exist or has missing tags, skipping... (${message})`);
    }
  }

  console.log(`🎉 Successfully seeded ${createdTopicsCount} topics!`);
  console.log('🌱 Seed completed successfully!');
}

void (async () => {
  try {
    await main();
  } catch (e) {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();