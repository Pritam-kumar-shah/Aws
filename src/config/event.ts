/**
 * Central configuration for the event.
 * Edit this single file to change ALL event-related text/settings across the app.
 */

export const EVENT_CONFIG = {
  // ─── Event basics ──────────────────────────────────────────────
  name: 'AWS re:Invent Watch & Build Party 2026',
  shortName: 'AWS re:Invent Watch & Build',
  tagline: 'Watch. Learn. Build. Together.',
  description:
    'Join student builders and cloud enthusiasts in Bhopal for an offline experience — live AWS re:Invent keynote watch party, hands-on build sessions with Amazon Bedrock, and networking.',
  date: '2026-12-02T11:00:00+05:30',
  dateDisplay: 'TBA (Announcing Soon)',
  timeDisplay: '11:00 AM – 04:00 PM IST',
  venue: 'Venue TBA (Bhopal)',
  city: 'Bhopal',
  state: 'Madhya Pradesh',
  country: 'India',
  fullAddress: 'Venue to be announced soon (Bhopal, Madhya Pradesh)',
  googleMapsUrl: 'https://maps.google.com/?q=Bhopal+Madhya+Pradesh',

  // ─── Capacity & registration ───────────────────────────────────
  capacity: 300,
  registrationOpen: true,
  registrationOpenDate: '2026-10-15T00:00:00+05:30',
  registrationCloseDate: '2026-11-28T23:59:59+05:30',

  // ─── Organizer ─────────────────────────────────────────────────
  organizer: 'AWS Student Builder Group at Technocrats Institute of Technology & Science',
  hostInstitution: 'Technocrats Institute of Technology & Science, Bhopal',
  contactEmail: 'awssbgtitscience@gmail.com',
  organizerEmail: 'mrpritamraj21@gmail.com',
  whatsAppGroupUrl: 'https://chat.whatsapp.com/D7s6FSEtOdDEyTVzolntWv?s=cl&p=a&iam=2',
  instagramUrl: 'https://www.instagram.com/awssbgtitscience',
  twitterUrl: '',
  linkedinUrl: 'https://www.linkedin.com/company/awb-sbg-at-tit-science/',
  githubUrl: '',
  developerName: 'Pritam Kumar',
  developerLinkedIn: 'https://www.linkedin.com/in/pritam-kumar-076163342',

  // ─── Footer / legal ───────────────────────────────────────────
  footerDisclaimer:
    'Hosted by AWS Student Builder Group at Technocrats Institute of Technology & Science.',
  privacyNote:
    'Your data is collected solely for event admission purposes and will not be shared with third parties.',

  // ─── Email settings ────────────────────────────────────────────
  emailDailyLimit: 280,
  emailFromName: 'AWS re:Invent Watch & Build',
  emailFromAddress: 'awssbgtitscience@gmail.com',

  // ─── Ticket ────────────────────────────────────────────────────
  ticketPrefix: 'REINV',

  // ─── Agenda (Minimalist: 11 AM - 4 PM, 1-2 PM Lunch, No extra details) ────
  agenda: [
    {
      time: '10:00 AM – 11:00 AM',
      title: 'Check-in & Registration',
    },
    {
      time: '11:00 AM – 12:00 PM',
      title: 'Session 1',
    },
    {
      time: '12:00 PM – 01:00 PM',
      title: 'Workshop 1',
    },
    {
      time: '01:00 PM – 02:00 PM',
      title: 'Lunch Break & Networking',
    },
    {
      time: '02:00 PM – 03:00 PM',
      title: 'Workshop 2',
    },
    {
      time: '03:00 PM – 04:00 PM',
      title: 'Session 2 & Closing',
    },
  ],

  // ─── FAQ ───────────────────────────────────────────────────────
  faq: [
    {
      q: 'Who is hosting this event?',
      a: 'This event is hosted by the AWS Student Builder Group at Technocrats Institute of Technology & Science, Bhopal, organized for student builders and cloud enthusiasts.',
    },
    {
      q: 'When and where will the event take place?',
      a: 'The event will take place offline in Bhopal from 11:00 AM to 04:00 PM (Check-in starts at 10:00 AM). The exact venue auditorium will be announced soon to all registered attendees.',
    },
    {
      q: 'What is the schedule for event day?',
      a: 'Check-in begins at 10:00 AM. Session 1 begins at 11:00 AM, followed by Workshop 1 at 12:00 PM, Lunch from 1:00 PM to 2:00 PM, Workshop 2 at 2:00 PM, and Session 2 / Swag Distribution from 3:00 PM to 4:00 PM.',
    },
    {
      q: 'Is admission free?',
      a: 'Yes, entry is 100% free! Advance registration is required to receive your verified HMAC digital admission ticket.',
    },
    {
      q: 'Who can register for this event?',
      a: 'Any enrolled college student, polytechnic student, working developer, or cloud enthusiast curious about AWS and AI can apply.',
    },
    {
      q: 'What should I bring on event day?',
      a: 'Bring your laptop with charger for hands-on build sessions, your college/work ID card for verification, and your digital admission ticket.',
    },
    {
      q: 'Will there be AWS goodies and swags?',
      a: 'Yes! Official community swags, t-shirts, stickers, and AWS cloud credits will be distributed to approved attendees.',
    },
    {
      q: 'How can I contact the organizing team?',
      a: 'You can reach out to the AWS Student Builder Group at awssbgtitscience@gmail.com or lead organizer at mrpritamraj21@gmail.com.',
    },
  ],

  // ─── Application form options ──────────────────────────────────
  roles: ['Student', 'Working Professional', 'Faculty', 'Freelancer', 'Other'] as const,
  experienceLevels: ['Beginner', 'Intermediate', 'Advanced'] as const,
  interestAreas: [
    'Cloud Computing',
    'AI / ML',
    'DevOps',
    'Web Development',
    'Data Engineering',
    'Security',
    'Serverless',
    'IoT',
    'Blockchain',
  ] as const,
  heardFromOptions: [
    'College Notice',
    'WhatsApp Group',
    'Social Media',
    'Friend / Classmate',
    'AWS Community',
    'LinkedIn',
    'Other',
  ] as const,
} as const;

export type EventConfig = typeof EVENT_CONFIG;
