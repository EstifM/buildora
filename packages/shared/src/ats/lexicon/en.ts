import type { Lexicon } from "./types";

// English language data for the ATS algorithm. These words are used for analysis
// (and a few verbs are written into experience bullets); none of it is UI text.

const STOP_WORDS = `
a about above after again against all also am an and any are as at be because been before being below
between both but by can could did do does doing down during each few for from further had has have having
he her here hers him his how i if in into is it its itself just me more most my no nor not now of off on
once only or other our ours out over own same she should so some such than that the their them then there
these they this those through to too under until up very was we were what when where which while who whom
why will with you your yours within without across per via etc ie eg us title
able ability abilities apply applicant applicants candidate candidates role position job jobs company
companies organization organisation team teams work working works worked year years month months day days
experience experienced experiences require required requires requirement requirements responsibility
responsibilities responsible duty duties qualification qualifications preferred prefer plus must strong
excellent good great proven solid demonstrated relevant related minimum least including include includes
include knowledge understanding familiarity skill skills well new key level high highly ideal looking seeking
join opportunity opportunities offer offers benefits salary location based full time part status equal
employer please send submit deadline email cv resume letter cover use using used make ensure provide
provides providing support supports various other others etc within across must-have nice field areas area
`;

// Each entry lists spellings that mean the same thing, separated by "|".
// A "~" prefix marks a spelling that only counts when found in a resume. It never creates a
// keyword from a job post and is never rewritten (e.g. "Excel" could be the verb "excel").
const SKILLS = [
  // Office & business tools
  "Microsoft Excel|MS Excel|~Excel", "Microsoft Word|MS Word", "Microsoft Office|MS Office", "PowerPoint",
  "Microsoft Outlook|~Outlook", "Google Workspace|G Suite", "Google Sheets", "QuickBooks", "Peachtree",
  "SAP", "Oracle", "ERP", "CRM|Customer Relationship Management", "Salesforce", "Tally", "Odoo", "Power BI|PowerBI", "Tableau", "SPSS",
  "Stata", "Jira", "Trello", "Slack", "Zoom",
  // Software & IT
  "JavaScript|JS", "TypeScript", "Python", "Java", "C++", "C#", ".NET|dotnet", "PHP", "Ruby", "Golang",
  "Kotlin", "SQL", "MySQL", "PostgreSQL|Postgres", "MongoDB", "HTML", "CSS", "React|React.js|ReactJS",
  "Angular", "Vue.js|Vue", "Node.js|NodeJS", "Next.js", "Django", "Flask", "Laravel", "Spring Boot",
  "REST API|REST APIs|RESTful API", "GraphQL", "Git", "GitHub", "Docker", "Kubernetes", "Linux",
  "AWS|Amazon Web Services", "Azure|Microsoft Azure", "Google Cloud|GCP", "CI/CD", "DevOps",
  "Machine Learning|ML", "Artificial Intelligence|AI", "Data Science", "Data Analysis|Data Analytics",
  "Data Entry", "Data Visualization", "Statistics", "Networking", "Cybersecurity|Cyber Security",
  "Technical Support|IT Support", "Troubleshooting", "Figma", "Adobe Photoshop|Photoshop", "Adobe Illustrator|Illustrator",
  "UI/UX|UX/UI", "Graphic Design", "Web Development", "Mobile Development", "Software Development",
  "Agile", "Scrum", "Testing", "Quality Assurance|QA",
  // Finance & accounting
  "Accounting", "Bookkeeping", "Financial Reporting", "Financial Analysis", "Budgeting", "Auditing|Audit",
  "IFRS", "GAAP", "Tax|Taxation", "Payroll", "Accounts Payable", "Accounts Receivable", "Reconciliation",
  "Cash Management", "Forecasting",
  // Management & operations
  "Project Management", "Program Management", "Operations Management", "Procurement", "Supply Chain",
  "Logistics", "Inventory Management", "Warehouse Management", "Risk Management", "Quality Control",
  "Strategic Planning", "Business Development", "Business Analysis", "Process Improvement",
  "Monitoring and Evaluation|M&E", "Grant Writing", "Proposal Writing", "Report Writing", "Documentation",
  "Stakeholder Management", "Change Management", "Event Planning",
  // Sales, marketing & service
  "Sales", "Marketing", "Digital Marketing", "Social Media|Social Media Marketing", "Content Writing",
  "Copywriting", "SEO|Search Engine Optimization", "Google Analytics", "Email Marketing", "Branding",
  "Market Research", "Customer Service|Customer Support",
  "Account Management", "Negotiation", "Public Relations|PR",
  // People & HR
  "Human Resources|HR", "Recruitment|Recruiting", "Onboarding", "Training", "Coaching", "Mentoring",
  "Performance Management", "Employee Relations",
  // Health, education & development
  "Public Health", "Nursing", "Patient Care", "Clinical Research", "Pharmacy", "Teaching",
  "Curriculum Development", "Research", "Community Engagement", "Fundraising",
  // Soft skills
  "Communication|Communication Skills", "Leadership", "Teamwork|Team Player", "Problem Solving", "Time Management", "Critical Thinking",
  "Attention to Detail|Detail Oriented", "Presentation Skills|Presentation", "Interpersonal Skills", "Multitasking",
  "Decision Making", "Conflict Resolution", "Adaptability", "Organizational Skills",
  // Languages
  "English", "Amharic", "Afaan Oromo|Oromo", "Tigrinya", "Arabic", "French",
];

// Each entry: "Past tense:base form" so we can prefer a verb the job post uses.
const MANAGE_VERBS = ["Managed:manage", "Led:lead", "Oversaw:oversee", "Coordinated:coordinate"];
const CONTRIBUTE_VERBS = ["Contributed to:contribute"];

export const en: Lexicon = {
  stopWords: new Set(STOP_WORDS.split(/\s+/).filter(Boolean)),
  sectionHeadings: {
    summary: [
      "summary", "professional summary", "career summary", "profile", "professional profile",
      "personal profile", "objective", "career objective", "about me", "about", "summary of qualifications",
      "qualifications summary", "career profile", "executive summary", "profile summary", "professional overview",
      "overview",
    ],
    skills: [
      "skills", "key skills", "technical skills", "core skills", "skills and abilities", "skills & abilities",
      "core competencies", "competencies", "skills & tools", "skills and tools", "areas of expertise", "expertise",
      "professional skills", "relevant skills", "skills summary", "key competencies", "technical competencies",
      "skills & competencies", "skills and competencies", "core strengths", "strengths", "technical proficiencies",
      "tools", "tools & technologies", "tools and technologies",
    ],
    experience: [
      "experience", "work experience", "professional experience", "employment history", "work history",
      "employment", "career history", "relevant experience", "professional background", "work background",
      "experience summary", "career experience", "employment experience", "professional history",
    ],
    education: [
      "education", "education and training", "education & training", "academic background",
      "academic qualifications", "educational background", "education & certifications",
      "education and certifications", "qualifications",
    ],
    other: [
      "certifications", "certificates", "licenses", "projects", "languages", "references", "awards",
      "achievements", "volunteer experience", "volunteering", "publications", "interests", "hobbies",
      "training", "trainings", "courses", "personal information", "personal details", "contact",
      "additional information", "certifications & training", "certifications and training", "key achievements",
      "accomplishments", "volunteer work",
    ],
  },
  skills: SKILLS.map((entry) => entry.split("|")),
  weakOpeners: [
    { phrase: "was responsible for", verbs: MANAGE_VERBS, convertGerund: true },
    { phrase: "responsible for", verbs: MANAGE_VERBS, convertGerund: true },
    { phrase: "in charge of", verbs: MANAGE_VERBS, convertGerund: true },
    { phrase: "tasked with", verbs: MANAGE_VERBS, convertGerund: true },
    { phrase: "duties included", verbs: MANAGE_VERBS, convertGerund: true },
    { phrase: "duties include", verbs: MANAGE_VERBS, convertGerund: true },
    { phrase: "worked on", verbs: CONTRIBUTE_VERBS, convertGerund: false },
    { phrase: "helped with", verbs: CONTRIBUTE_VERBS, convertGerund: false },
    { phrase: "assisted with", verbs: CONTRIBUTE_VERBS, convertGerund: false },
    { phrase: "assisted in", verbs: CONTRIBUTE_VERBS, convertGerund: false },
    { phrase: "involved in", verbs: CONTRIBUTE_VERBS, convertGerund: false },
    { phrase: "participated in", verbs: CONTRIBUTE_VERBS, convertGerund: false },
  ],
  irregularPast: {
    leading: "led", writing: "wrote", making: "made", building: "built", running: "ran", teaching: "taught",
    selling: "sold", overseeing: "oversaw", setting: "set", keeping: "kept", bringing: "brought",
    buying: "bought", holding: "held", meeting: "met", driving: "drove", giving: "gave", taking: "took",
    doing: "did", seeing: "saw", speaking: "spoke", dealing: "dealt", sending: "sent", spending: "spent",
    paying: "paid", winning: "won", getting: "got", finding: "found", thinking: "thought", understanding: "understood",
  },
  // "-ing" words that are usually nouns ("responsible for accounting"), so we don't turn them into verbs.
  nounGerunds: new Set([
    "accounting", "bookkeeping", "nursing", "banking", "housekeeping", "engineering", "marketing",
    "advertising", "catering", "ticketing", "packaging", "clothing", "funding", "pricing", "staffing",
    "learning", "everything", "anything", "something",
    "nothing", "during", "string", "spring", "morning", "evening", "wellbeing", "manufacturing", "lending",
  ]),
};
