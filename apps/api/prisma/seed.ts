import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Lumina Scholar database...\n');

  const HASH = await bcrypt.hash('password123', 10);

  // ── Tenant ──────────────────────────────────────────────────────────────
  let tenant = await prisma.tenant.findFirst({ where: { name: 'Lumina University' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: { name: 'Lumina University' },
    });
  }
  console.log(`✔  Tenant: ${tenant.name}`);

  // ── Professor ────────────────────────────────────────────────────────────
  let professor = await prisma.user.findUnique({ where: { email: 'professor@lumina.test' } });
  if (!professor) {
    professor = await prisma.user.create({
      data: {
        email: 'professor@lumina.test',
        passwordHash: HASH,
        name: 'Dr. Sarah Mitchell',
        role: 'PROFESSOR',
        tenantId: tenant.id,
      },
    });
  }
  console.log(`✔  Professor: ${professor.name} (${professor.email})`);

  // ── Students ─────────────────────────────────────────────────────────────
  const studentData = [
    { name: 'Alex Johnson',   email: 'student1@lumina.test' },
    { name: 'Maria Garcia',   email: 'student2@lumina.test' },
    { name: 'James Wilson',   email: 'student3@lumina.test' },
    { name: 'Emma Davis',     email: 'student4@lumina.test' },
    { name: 'Noah Martinez',  email: 'student5@lumina.test' },
  ];

  const students: any[] = [];
  for (const s of studentData) {
    let student = await prisma.user.findUnique({ where: { email: s.email } });
    if (!student) {
      student = await prisma.user.create({
        data: {
          email: s.email,
          passwordHash: HASH,
          name: s.name,
          role: 'STUDENT',
          tenantId: tenant.id,
        },
      });
    }
    students.push(student);
  }
  console.log(`✔  ${students.length} students created`);

  // ── Courses ───────────────────────────────────────────────────────────────
  const courseNames = ['Introduction to AI', 'Data Structures & Algorithms'];
  const courses: any[] = [];

  for (const name of courseNames) {
    let course = await prisma.course.findFirst({
      where: { name, professorId: professor.id, tenantId: tenant.id },
    });
    if (!course) {
      course = await prisma.course.create({
        data: {
          name,
          description: `${name} — taught by Dr. Mitchell`,
          tenantId: tenant.id,
          professorId: professor.id,
        },
      });
    }
    courses.push(course);
  }
  console.log(`✔  ${courses.length} courses created`);

  // ── Enroll all students in all courses ────────────────────────────────────
  for (const course of courses) {
    for (const student of students) {
      await prisma.enrollment.upsert({
        where: { studentId_courseId: { studentId: student.id, courseId: course.id } },
        create: { studentId: student.id, courseId: course.id },
        update: {},
      });
    }
  }
  console.log('✔  All students enrolled in all courses');

  // ── Assignments ───────────────────────────────────────────────────────────
  // Three past-deadline assignments per course so deadline tracking kicks in
  const now = new Date();
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  const assignmentDefs = [
    { name: 'Assignment 1 — Research Paper',    deadline: daysAgo(20) },
    { name: 'Assignment 2 — Lab Report',         deadline: daysAgo(10) },
    { name: 'Assignment 3 — Final Project',      deadline: daysAgo(3)  },
  ];

  const allAssignments: { courseId: string; doc: any }[] = [];

  for (const course of courses) {
    for (const def of assignmentDefs) {
      let doc = await prisma.document.findFirst({
        where: { originalName: def.name, courseId: course.id },
      });
      if (!doc) {
        doc = await prisma.document.create({
          data: {
            filename:     `${uuidv4()}.pdf`,
            originalName: def.name,
            filePath:     `/seed/placeholder/${uuidv4()}.pdf`,
            status:       'INDEXED',
            courseId:     course.id,
            uploadedById: professor.id,
            tenantId:     tenant.id,
            isAssignment: true,
            deadline:     def.deadline,
          },
        });
      }
      allAssignments.push({ courseId: course.id, doc });
    }
  }
  console.log(`✔  ${allAssignments.length} assignments created`);

  // ── Submissions with varied patterns ─────────────────────────────────────
  // Student performance profiles — scores out of 20:
  //  [0] Alex     — excellent: submits all on time, high grades (17-19)
  //  [1] Maria    — good:     submits all on time, good grades (14-16)
  //  [2] James    — average:  submits most on time, average grades (12-14)
  //  [3] Emma     — at-risk:  misses 1 deadline per course, low grades (8-10)
  //  [4] Noah     — failing:  misses 2 deadlines per course, very low grades (5-7)

  const profiles = [
    { submitCount: 3, scores: [18, 17, 19], lateIndexes: [] },        // Alex — excellent
    { submitCount: 3, scores: [15, 14, 16], lateIndexes: [] },        // Maria — good
    { submitCount: 2, scores: [13, 12, null], lateIndexes: [1] },     // James — average (misses last)
    { submitCount: 2, scores: [10, null,  9], lateIndexes: [0] },     // Emma — at-risk
    { submitCount: 1, scores: [ 6, null, null], lateIndexes: [] },    // Noah — failing
  ];

  let submissionsCreated = 0;
  for (const course of courses) {
    const courseAssignments = allAssignments.filter(a => a.courseId === course.id);

    for (let si = 0; si < students.length; si++) {
      const student = students[si];
      const profile = profiles[si];

      for (let ai = 0; ai < courseAssignments.length; ai++) {
        const { doc } = courseAssignments[ai];
        const score = profile.scores[ai] ?? null;

        // Only submit if within submitCount
        if (ai >= profile.submitCount) continue;

        const isLate = profile.lateIndexes.includes(ai);
        const submittedAt = isLate
          ? new Date(new Date(doc.deadline).getTime() + 2 * 86400000) // 2 days late
          : new Date(new Date(doc.deadline).getTime() - 86400000);    // 1 day early

        await prisma.submission.upsert({
          where: { documentId_studentId: { documentId: doc.id, studentId: student.id } },
          create: {
            documentId: doc.id,
            studentId: student.id,
            score,
            submittedAt,
            submissionFileName: null,
            submissionFilePath: null,
          },
          update: { score, submittedAt },
        });
        submissionsCreated++;
      }
    }
  }
  console.log(`✔  ${submissionsCreated} submissions created`);

  // ── AI Query Messages (varied engagement) ─────────────────────────────────
  // queriesAsked values: Alex=14, Maria=9, James=4, Emma=2, Noah=1
  const queryProfiles = [14, 9, 4, 2, 1];
  let messagesCreated = 0;

  for (const course of courses) {
    for (let si = 0; si < students.length; si++) {
      const student = students[si];
      const count = queryProfiles[si];

      for (let i = 0; i < count; i++) {
        const existing = await prisma.message.findFirst({
          where: { userId: student.id, courseId: course.id, query: `Study query ${i + 1} for ${course.name}` },
        });
        if (!existing) {
          await prisma.message.create({
            data: {
              sessionId:  uuidv4(),
              query:      `Study query ${i + 1} for ${course.name}`,
              response:   `AI response ${i + 1}`,
              courseId:   course.id,
              userId:     student.id,
              tenantId:   tenant.id,
            },
          });
          messagesCreated++;
        }
      }
    }
  }
  console.log(`✔  ${messagesCreated} AI study messages created`);

  console.log('\n🎉 Seed complete!\n');
  console.log('Login credentials:');
  console.log('  Professor : professor@lumina.test / password123');
  console.log('  Students  : student1@lumina.test … student5@lumina.test / password123');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
