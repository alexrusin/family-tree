import "dotenv/config";
import { randomBytes, randomUUID } from "crypto";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const TARGET_EMAIL = "alex1@alex.com";
const TREE_NAME = "Test Family (150)";
const TARGET_MEMBERS = 150;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

function shareToken(): string {
  return randomBytes(16).toString("base64url");
}

type Gender = "male" | "female";

const MALE_NAMES = [
  "James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph",
  "Thomas", "Charles", "Daniel", "Matthew", "Anthony", "Mark", "Donald", "Steven",
  "Paul", "Andrew", "Joshua", "Kenneth", "Kevin", "Brian", "George", "Edward",
  "Ronald", "Timothy", "Jason", "Jeffrey", "Ryan", "Jacob", "Gary", "Nicholas",
  "Eric", "Jonathan", "Stephen", "Larry", "Justin", "Scott", "Brandon", "Frank",
  "Benjamin", "Gregory", "Samuel", "Raymond", "Patrick", "Alexander", "Jack", "Dennis",
];

const FEMALE_NAMES = [
  "Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica",
  "Sarah", "Karen", "Nancy", "Lisa", "Margaret", "Betty", "Sandra", "Ashley",
  "Dorothy", "Kimberly", "Emily", "Donna", "Michelle", "Carol", "Amanda", "Melissa",
  "Deborah", "Stephanie", "Rebecca", "Laura", "Helen", "Sharon", "Cynthia", "Kathleen",
  "Amy", "Angela", "Shirley", "Anna", "Ruth", "Brenda", "Pamela", "Nicole",
  "Katherine", "Virginia", "Catherine", "Christine", "Samantha", "Debra", "Rachel", "Carolyn",
];

const SURNAMES = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
  "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
  "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark",
];

let maleIdx = 0;
let femaleIdx = 0;
function nextName(gender: Gender): string {
  if (gender === "male") return MALE_NAMES[maleIdx++ % MALE_NAMES.length];
  return FEMALE_NAMES[femaleIdx++ % FEMALE_NAMES.length];
}

interface Member {
  id: string;
  firstName: string;
  lastName: string;
  gender: Gender;
  isLiving: boolean;
  birthYear: number;
}

interface Rel {
  fromMemberId: string;
  toMemberId: string;
  type: "parent" | "spouse";
}

const members: Member[] = [];
const relationships: Rel[] = [];

function makeMember(gender: Gender, lastName: string, birthYear: number): Member {
  const isLiving = birthYear >= 1945;
  const m: Member = {
    id: randomUUID(),
    firstName: nextName(gender),
    lastName,
    gender,
    isLiving,
    birthYear,
  };
  members.push(m);
  return m;
}

// A married couple: two members + spouse relationship.
function makeCouple(
  gender: Gender,
  lineLastName: string,
  spouseLastName: string,
  birthYear: number,
): { self: Member; spouse: Member } {
  const self = makeMember(gender, lineLastName, birthYear);
  const spouseGender: Gender = gender === "male" ? "female" : "male";
  const spouse = makeMember(spouseGender, spouseLastName, birthYear + rand(-3, 3));
  const [a, b] = [self.id, spouse.id].sort();
  relationships.push({ fromMemberId: a, toMemberId: b, type: "spouse" });
  return { self, spouse };
}

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickSurname(): string {
  return SURNAMES[rand(0, SURNAMES.length - 1)];
}

// Link two parents -> a child.
function linkParents(parentA: Member, parentB: Member, child: Member) {
  relationships.push({ fromMemberId: parentA.id, toMemberId: child.id, type: "parent" });
  relationships.push({ fromMemberId: parentB.id, toMemberId: child.id, type: "parent" });
}

// ---------------------------------------------------------------------------
// Build a multi-generation tree until we reach TARGET_MEMBERS.
// Gen 0: founding couple. Each subsequent generation, some members from the
// previous generation "marry in" a spouse and have children.
// ---------------------------------------------------------------------------
const FAMILY_SURNAME = "Sterling";

// Founding couple (gen 0), born ~1900.
const founder = makeCouple("male", FAMILY_SURNAME, pickSurname(), 1900);

// A "unit" is a couple whose bloodline member carries the family surname and
// who can produce children.
interface Unit {
  bloodline: Member; // carries lineage
  spouse: Member;
  birthYear: number;
}

let currentGen: Unit[] = [
  { bloodline: founder.self, spouse: founder.spouse, birthYear: 1900 },
];
let genNumber = 0;

while (members.length < TARGET_MEMBERS && genNumber < 8) {
  const nextGen: Unit[] = [];
  const childBirthBase = currentGen[0].birthYear + 28;

  for (const unit of currentGen) {
    if (members.length >= TARGET_MEMBERS) break;
    const numChildren = rand(2, 4);

    for (let c = 0; c < numChildren; c++) {
      if (members.length >= TARGET_MEMBERS) break;

      const childGender: Gender = Math.random() < 0.5 ? "male" : "female";
      const childBirthYear = childBirthBase + rand(-3, 6);
      const child = makeMember(childGender, FAMILY_SURNAME, childBirthYear);
      linkParents(unit.bloodline, unit.spouse, child);

      // ~70% of children marry (and can continue the line), if budget allows.
      if (Math.random() < 0.7 && members.length < TARGET_MEMBERS) {
        const spouseGender: Gender = childGender === "male" ? "female" : "male";
        const spouse = makeMember(spouseGender, pickSurname(), childBirthYear + rand(-3, 3));
        const [a, b] = [child.id, spouse.id].sort();
        relationships.push({ fromMemberId: a, toMemberId: b, type: "spouse" });
        nextGen.push({ bloodline: child, spouse, birthYear: childBirthYear });
      }
    }
  }

  if (nextGen.length === 0) break;
  currentGen = nextGen;
  genNumber++;
}

// ---------------------------------------------------------------------------
// Persist
// ---------------------------------------------------------------------------
async function main() {
  const user = await prisma.user.findUnique({ where: { email: TARGET_EMAIL } });
  if (!user) {
    throw new Error(`User with email ${TARGET_EMAIL} not found. Aborting.`);
  }

  console.log(
    `Building tree for ${TARGET_EMAIL}: ${members.length} members, ` +
      `${relationships.length} relationships, ${genNumber + 1} generations.`,
  );

  const result = await prisma.$transaction(async (tx) => {
    const tree = await tx.familyTree.create({
      data: {
        name: TREE_NAME,
        ownerId: user.id,
        shareToken: shareToken(),
        shareEnabled: false,
        memberCount: members.length,
      },
    });

    await tx.treeMember.createMany({
      data: members.map((m) => ({
        id: m.id,
        treeId: tree.id,
        firstName: m.firstName,
        lastName: m.lastName,
        gender: m.gender,
        isLiving: m.isLiving,
        birthPrecision: "year" as const,
        birthYear: m.birthYear,
      })),
    });

    await tx.relationship.createMany({
      data: relationships.map((r) => ({
        treeId: tree.id,
        fromMemberId: r.fromMemberId,
        toMemberId: r.toMemberId,
        type: r.type,
      })),
    });

    return tree;
  });

  console.log(`✅ Created tree "${result.name}" (id: ${result.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
