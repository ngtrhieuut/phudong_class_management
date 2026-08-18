import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { db } from "@/db";
import { getVietnamDayRange } from "@/lib/time/vietnam";
import {
  behaviorTemplates,
  badgeDefinitions,
  classes,
  classRoles,
  classMemberships,
  classStudents,
  levelDefinitions,
  praisePosts,
  praisePostStudents,
  rewardRedemptions,
  schoolYears,
  scoreTransactions,
  studentGuardians,
  studentBadges,
  students,
  studentScoreSnapshots,
  guardians,
  taskAssignments,
  tasks,
  users,
} from "@/db/schema";

const teacherRoles = ["homeroom_teacher", "teacher", "assistant"] as const;

export type TeacherClassContext = {
  id: string;
  organizationId: string;
  schoolYearId: string;
  name: string;
  grade: number;
  schoolYearName: string;
};

export type ClassStudentGuardianRow = {
  id: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  relationship: string;
};

export type ClassStudentRow = {
  id: string;
  studentCode: string;
  fullName: string;
  shortName: string | null;
  avatarUrl?: string | null;
  birthDate: string | null;
  gender: "male" | "female" | "other" | "undisclosed" | null;
  seatNo: number | null;
  groupName: string | null;
  classRoleId?: string | null;
  classRoleName: string | null;
  guardians?: ClassStudentGuardianRow[];
  taskStatus: "completed" | "in_progress" | "not_started";
  lifetimeScore: number;
  spendableStars: number;
};

export type TeacherDashboardData = {
  classContext: TeacherClassContext;
  students: ClassStudentRow[];
  todayScore: number;
  behaviorTemplates: Array<{
    id: string;
    name: string;
    category: "positive" | "needs_improvement";
    defaultPoints: number;
    icon: string | null;
    parentVisibility: "visible" | "hidden";
  }>;
  recentScores: Array<{
    id: string;
    studentId: string;
    studentName: string;
    behaviorName: string | null;
    reason: string;
    lifetimeDelta: number;
    spendableDelta: number;
    occurredAt: Date;
  }>;
  praise: Array<{
    id: string;
    title: string;
    body: string;
    studentNames: string;
    createdAt: Date;
  }>;
  levels: Array<{
    id: string;
    name: string;
    minScore: number;
    maxScore: number | null;
    sortOrder: number;
  }>;
};

function accessibleClassCondition(userId: string, classId?: string) {
  return and(
    eq(classMemberships.userId, userId),
    inArray(classMemberships.role, teacherRoles),
    eq(users.status, "active"),
    sql`coalesce(${classes.settingsJson}->>'archived', 'false') <> 'true'`,
    classId ? eq(classes.id, classId) : undefined,
  );
}

export async function getTeacherClasses(userId: string): Promise<TeacherClassContext[]> {
  return db
    .select({
      id: classes.id,
      organizationId: classes.organizationId,
      schoolYearId: classes.schoolYearId,
      name: classes.name,
      grade: classes.grade,
      schoolYearName: schoolYears.name,
    })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .innerJoin(classes, eq(classes.id, classMemberships.classId))
    .innerJoin(schoolYears, eq(schoolYears.id, classes.schoolYearId))
    .where(accessibleClassCondition(userId))
    .orderBy(desc(schoolYears.active), asc(classes.name));
}

export async function getTeacherClass(
  userId: string,
  classId?: string,
): Promise<TeacherClassContext | null> {
  const [classContext] = await db
    .select({
      id: classes.id,
      organizationId: classes.organizationId,
      schoolYearId: classes.schoolYearId,
      name: classes.name,
      grade: classes.grade,
      schoolYearName: schoolYears.name,
    })
    .from(classMemberships)
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .innerJoin(classes, eq(classes.id, classMemberships.classId))
    .innerJoin(schoolYears, eq(schoolYears.id, classes.schoolYearId))
    .where(accessibleClassCondition(userId, classId))
    .orderBy(desc(schoolYears.active), asc(classes.name))
    .limit(1);

  return classContext ?? null;
}

export async function getClassStudents(
  userId: string,
  classId: string,
  searchTerm?: string,
): Promise<ClassStudentRow[]> {
  const classContext = await getTeacherClass(userId, classId);
  if (!classContext) {
    throw new Error("FORBIDDEN_CLASS_ACCESS");
  }

  const normalizedSearch = searchTerm?.trim();
  const searchCondition = normalizedSearch
    ? or(
        ilike(students.fullName, `%${normalizedSearch}%`),
        ilike(students.studentCode, `%${normalizedSearch}%`),
        ilike(classStudents.groupName, `%${normalizedSearch}%`),
        sql`exists (
          select 1
          from ${studentGuardians} as sg
          inner join ${guardians} as g on g.id = sg.guardian_id
          where sg.student_id = ${students.id}
            and (
              g.full_name ilike ${`%${normalizedSearch}%`}
              or coalesce(g.phone, '') ilike ${`%${normalizedSearch}%`}
              or coalesce(g.email, '') ilike ${`%${normalizedSearch}%`}
            )
        )`,
      )
    : undefined;

  const [studentRows, taskStatusRows] = await Promise.all([
    db
      .select({
        id: students.id,
        studentCode: students.studentCode,
        fullName: students.fullName,
        shortName: students.shortName,
        avatarUrl: students.avatarUrl,
        birthDate: students.birthDate,
        gender: students.gender,
        seatNo: classStudents.seatNo,
        groupName: classStudents.groupName,
        classRoleId: classStudents.classRoleId,
        classRoleName: classRoles.name,
        lifetimeScore: sql<number>`coalesce(${studentScoreSnapshots.lifetimeScore}, 0)`,
        spendableStars: sql<number>`coalesce(${studentScoreSnapshots.spendableStars}, 0)`,
      })
      .from(classStudents)
      .innerJoin(students, eq(students.id, classStudents.studentId))
      .leftJoin(
        classRoles,
        and(eq(classRoles.id, classStudents.classRoleId), eq(classRoles.classId, classStudents.classId)),
      )
      .leftJoin(
        studentScoreSnapshots,
        and(
          eq(studentScoreSnapshots.studentId, classStudents.studentId),
          eq(studentScoreSnapshots.classId, classStudents.classId),
        ),
      )
      .where(
        and(
          eq(classStudents.classId, classId),
          isNull(classStudents.leftAt),
          eq(students.status, "active"),
          searchCondition,
        ),
      )
      .orderBy(asc(classStudents.seatNo), asc(students.fullName)),
    db
      .select({
        studentId: taskAssignments.studentId,
        taskStatus: sql<ClassStudentRow["taskStatus"]>`case
          when count(${taskAssignments.id}) = 0 then 'not_started'
          when count(${taskAssignments.id}) filter (where ${taskAssignments.status} = 'completed') = count(${taskAssignments.id}) then 'completed'
          else 'in_progress'
        end`,
      })
      .from(taskAssignments)
      .innerJoin(tasks, eq(tasks.id, taskAssignments.taskId))
      .where(and(eq(tasks.classId, classId), inArray(tasks.status, ["active", "completed", "expired"])))
      .groupBy(taskAssignments.studentId),
  ]);

  const guardianRows = studentRows.length
    ? await db
        .select({
          studentId: studentGuardians.studentId,
          id: guardians.id,
          fullName: guardians.fullName,
          phone: guardians.phone,
          email: guardians.email,
          relationship: studentGuardians.relationship,
        })
        .from(studentGuardians)
        .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
        .where(inArray(studentGuardians.studentId, studentRows.map((student) => student.id)))
        .orderBy(asc(studentGuardians.studentId), asc(guardians.fullName))
    : [];
  const guardiansByStudent = new Map<string, ClassStudentGuardianRow[]>();
  for (const guardian of guardianRows) {
    const list = guardiansByStudent.get(guardian.studentId) ?? [];
    list.push({ id: guardian.id, fullName: guardian.fullName, phone: guardian.phone, email: guardian.email, relationship: guardian.relationship });
    guardiansByStudent.set(guardian.studentId, list);
  }

  const taskStatusByStudent = new Map(taskStatusRows.map((row) => [row.studentId, row.taskStatus]));
  return studentRows.map((student) => ({
    ...student,
    guardians: guardiansByStudent.get(student.id) ?? [],
    taskStatus: taskStatusByStudent.get(student.id) ?? "not_started",
  }));
}

export async function getTeacherStudentProfile(userId: string, studentId: string) {
  const [profile] = await db
    .select({
      id: students.id,
      organizationId: classes.organizationId,
      schoolYearId: classes.schoolYearId,
      grade: classes.grade,
      studentCode: students.studentCode,
      fullName: students.fullName,
      shortName: students.shortName,
      avatarUrl: students.avatarUrl,
      birthDate: students.birthDate,
      gender: students.gender,
      seatNo: classStudents.seatNo,
      groupName: classStudents.groupName,
      classRoleId: classStudents.classRoleId,
      classRoleName: classRoles.name,
      classId: classStudents.classId,
      className: classes.name,
      schoolYearName: schoolYears.name,
      lifetimeScore: sql<number>`coalesce(${studentScoreSnapshots.lifetimeScore}, 0)`,
      spendableStars: sql<number>`coalesce(${studentScoreSnapshots.spendableStars}, 0)`,
    })
    .from(classStudents)
    .innerJoin(classMemberships, eq(classMemberships.classId, classStudents.classId))
    .innerJoin(users, eq(users.id, classMemberships.userId))
    .innerJoin(students, eq(students.id, classStudents.studentId))
    .innerJoin(classes, eq(classes.id, classStudents.classId))
    .innerJoin(schoolYears, eq(schoolYears.id, classes.schoolYearId))
    .leftJoin(
      classRoles,
      and(eq(classRoles.id, classStudents.classRoleId), eq(classRoles.classId, classStudents.classId)),
    )
    .leftJoin(
      studentScoreSnapshots,
      and(
        eq(studentScoreSnapshots.studentId, classStudents.studentId),
        eq(studentScoreSnapshots.classId, classStudents.classId),
      ),
    )
    .where(
      and(
        eq(classStudents.studentId, studentId),
        eq(classMemberships.userId, userId),
        inArray(classMemberships.role, teacherRoles),
        eq(users.status, "active"),
        isNull(classStudents.leftAt),
        eq(students.status, "active"),
        eq(students.organizationId, classes.organizationId),
      ),
    )
    .limit(1);

  if (!profile) {
    return null;
  }

  const classContext: TeacherClassContext = {
    id: profile.classId,
    organizationId: profile.organizationId,
    schoolYearId: profile.schoolYearId,
    name: profile.className,
    grade: profile.grade,
    schoolYearName: profile.schoolYearName,
  };

  const [scores, badges, badgeOptions, levels, weeklyTrend, monthlyTrend, behaviorBreakdown, guardianRows, classRoleOptions] = await Promise.all([
    db
      .select({
        id: scoreTransactions.id,
        reason: scoreTransactions.reason,
        lifetimeDelta: scoreTransactions.lifetimeDelta,
        spendableDelta: scoreTransactions.spendableDelta,
        occurredAt: scoreTransactions.occurredAt,
      })
      .from(scoreTransactions)
      .where(
        and(
          eq(scoreTransactions.classId, profile.classId),
          eq(scoreTransactions.studentId, profile.id),
        ),
      )
      .orderBy(desc(scoreTransactions.occurredAt))
      .limit(50),
    db
      .select({
        id: badgeDefinitions.id,
        name: badgeDefinitions.name,
        description: badgeDefinitions.description,
        iconUrl: badgeDefinitions.iconUrl,
        awardedAt: studentBadges.awardedAt,
      })
      .from(studentBadges)
      .innerJoin(badgeDefinitions, eq(badgeDefinitions.id, studentBadges.badgeId))
      .where(
        and(
          eq(studentBadges.classId, profile.classId),
          eq(studentBadges.studentId, profile.id),
        ),
      )
      .orderBy(desc(studentBadges.awardedAt))
      .limit(20),
    db
      .select({
        id: badgeDefinitions.id,
        name: badgeDefinitions.name,
        description: badgeDefinitions.description,
      })
      .from(badgeDefinitions)
      .where(
        and(
          eq(badgeDefinitions.active, true),
          or(eq(badgeDefinitions.classId, profile.classId), isNull(badgeDefinitions.classId)),
        ),
      )
      .orderBy(asc(badgeDefinitions.name)),
    db
      .select({
        id: levelDefinitions.id,
        name: levelDefinitions.name,
        minScore: levelDefinitions.minScore,
        maxScore: levelDefinitions.maxScore,
        sortOrder: levelDefinitions.sortOrder,
      })
      .from(levelDefinitions)
      .where(or(eq(levelDefinitions.classId, profile.classId), isNull(levelDefinitions.classId)))
      .orderBy(asc(levelDefinitions.sortOrder)),
    db
      .select({
        period: sql<string>`to_char(date_trunc('week', ${scoreTransactions.occurredAt}), 'YYYY-MM-DD')`,
        total: sql<number>`coalesce(sum(${scoreTransactions.lifetimeDelta}), 0)`,
        events: sql<number>`count(${scoreTransactions.id})`,
      })
      .from(scoreTransactions)
      .where(
        and(
          eq(scoreTransactions.classId, profile.classId),
          eq(scoreTransactions.studentId, profile.id),
          sql`${scoreTransactions.occurredAt} >= now() - interval '12 weeks'`,
        ),
      )
      .groupBy(sql`date_trunc('week', ${scoreTransactions.occurredAt})`)
      .orderBy(asc(sql`date_trunc('week', ${scoreTransactions.occurredAt})`)),
    db
      .select({
        period: sql<string>`to_char(date_trunc('month', ${scoreTransactions.occurredAt}), 'YYYY-MM')`,
        total: sql<number>`coalesce(sum(${scoreTransactions.lifetimeDelta}), 0)`,
        events: sql<number>`count(${scoreTransactions.id})`,
      })
      .from(scoreTransactions)
      .where(
        and(
          eq(scoreTransactions.classId, profile.classId),
          eq(scoreTransactions.studentId, profile.id),
          sql`${scoreTransactions.occurredAt} >= now() - interval '6 months'`,
        ),
      )
      .groupBy(sql`date_trunc('month', ${scoreTransactions.occurredAt})`)
      .orderBy(asc(sql`date_trunc('month', ${scoreTransactions.occurredAt})`)),
    db
      .select({
        category: behaviorTemplates.category,
        behaviorName: sql<string>`coalesce(${behaviorTemplates.name}, ${scoreTransactions.transactionType}::text)`,
        total: sql<number>`coalesce(sum(${scoreTransactions.lifetimeDelta}), 0)`,
        events: sql<number>`count(${scoreTransactions.id})`,
      })
      .from(scoreTransactions)
      .leftJoin(behaviorTemplates, eq(behaviorTemplates.id, scoreTransactions.behaviorTemplateId))
      .where(and(eq(scoreTransactions.classId, profile.classId), eq(scoreTransactions.studentId, profile.id)))
      .groupBy(behaviorTemplates.category, behaviorTemplates.name, scoreTransactions.transactionType)
      .orderBy(desc(sql`sum(${scoreTransactions.lifetimeDelta})`), desc(sql`count(${scoreTransactions.id})`))
      .limit(20),
    db
      .select({
        id: guardians.id,
        fullName: guardians.fullName,
        phone: guardians.phone,
        email: guardians.email,
        relationship: studentGuardians.relationship,
      })
      .from(studentGuardians)
      .innerJoin(guardians, eq(guardians.id, studentGuardians.guardianId))
      .where(eq(studentGuardians.studentId, profile.id))
      .orderBy(asc(studentGuardians.relationship), asc(guardians.fullName)),
    db
      .select({ id: classRoles.id, name: classRoles.name, icon: classRoles.icon, description: classRoles.description })
      .from(classRoles)
      .where(eq(classRoles.classId, profile.classId))
      .orderBy(asc(classRoles.sortOrder), asc(classRoles.name)),
  ]);

  return { classContext, profile, scores, badges, badgeOptions, levels, weeklyTrend, monthlyTrend, behaviorBreakdown, guardians: guardianRows, classRoles: classRoleOptions };
}

export async function getTeacherDashboardData(
  userId: string,
  classId?: string,
  searchTerm?: string,
): Promise<TeacherDashboardData | null> {
  const classContext = await getTeacherClass(userId, classId);
  if (!classContext) {
    return null;
  }

  const { from: todayStart, to: tomorrowStart } = getVietnamDayRange();
  const [classStudentsData, behaviors, scores, praise, levels, todayScoreRows] = await Promise.all([
    getClassStudents(userId, classContext.id, searchTerm),
    db
      .select({
        id: behaviorTemplates.id,
        name: behaviorTemplates.name,
        category: behaviorTemplates.category,
        defaultPoints: behaviorTemplates.defaultPoints,
        icon: behaviorTemplates.icon,
        parentVisibility: behaviorTemplates.parentVisibility,
      })
      .from(behaviorTemplates)
      .where(
        and(
          eq(behaviorTemplates.active, true),
          or(
            eq(behaviorTemplates.classId, classContext.id),
            and(isNull(behaviorTemplates.classId), eq(behaviorTemplates.organizationId, classContext.organizationId)),
          ),
        ),
      )
      .orderBy(asc(behaviorTemplates.name)),
    db
      .select({
        id: scoreTransactions.id,
        studentId: scoreTransactions.studentId,
        studentName: students.fullName,
        behaviorName: behaviorTemplates.name,
        reason: scoreTransactions.reason,
        lifetimeDelta: scoreTransactions.lifetimeDelta,
        spendableDelta: scoreTransactions.spendableDelta,
        occurredAt: scoreTransactions.occurredAt,
      })
      .from(scoreTransactions)
      .innerJoin(
        classStudents,
        and(
          eq(classStudents.classId, scoreTransactions.classId),
          eq(classStudents.studentId, scoreTransactions.studentId),
        ),
      )
      .innerJoin(students, eq(students.id, scoreTransactions.studentId))
      .leftJoin(behaviorTemplates, eq(behaviorTemplates.id, scoreTransactions.behaviorTemplateId))
      .where(and(eq(scoreTransactions.classId, classContext.id), isNull(classStudents.leftAt)))
      .orderBy(desc(scoreTransactions.occurredAt))
      .limit(20),
    db
      .select({
        id: praisePosts.id,
        title: praisePosts.title,
        body: praisePosts.body,
        studentNames: sql<string>`coalesce(string_agg(distinct ${students.fullName}, ', '), 'Lớp học')`,
        createdAt: praisePosts.createdAt,
      })
      .from(praisePosts)
      .leftJoin(praisePostStudents, eq(praisePostStudents.postId, praisePosts.id))
      .leftJoin(students, eq(students.id, praisePostStudents.studentId))
      .where(eq(praisePosts.classId, classContext.id))
      .groupBy(praisePosts.id)
      .orderBy(desc(praisePosts.createdAt))
      .limit(10),
    db
      .select({
        id: levelDefinitions.id,
        name: levelDefinitions.name,
        minScore: levelDefinitions.minScore,
        maxScore: levelDefinitions.maxScore,
        sortOrder: levelDefinitions.sortOrder,
      })
      .from(levelDefinitions)
      .where(or(eq(levelDefinitions.classId, classContext.id), isNull(levelDefinitions.classId)))
      .orderBy(asc(levelDefinitions.sortOrder)),
    db
      .select({
        total: sql<number>`coalesce(sum(${scoreTransactions.lifetimeDelta}), 0)`,
      })
      .from(scoreTransactions)
      .where(
        and(
          eq(scoreTransactions.classId, classContext.id),
          gte(scoreTransactions.occurredAt, todayStart),
          sql`${scoreTransactions.occurredAt} < ${tomorrowStart}`,
        ),
      ),
  ]);

  return {
    classContext,
    students: classStudentsData,
    todayScore: Number(todayScoreRows[0]?.total ?? 0),
    behaviorTemplates: behaviors,
    recentScores: scores,
    praise,
    levels,
  };
}

export async function getGuardianStudents(userId: string) {
  return db
    .select({
      studentId: students.id,
      studentCode: students.studentCode,
      fullName: students.fullName,
      shortName: students.shortName,
      classId: classes.id,
      className: classes.name,
      schoolYearName: schoolYears.name,
      lifetimeScore: sql<number>`coalesce(${studentScoreSnapshots.lifetimeScore}, 0)`,
      spendableStars: sql<number>`coalesce(${studentScoreSnapshots.spendableStars}, 0)`,
    })
    .from(guardians)
    .innerJoin(users, eq(users.id, guardians.userId))
    .innerJoin(studentGuardians, eq(studentGuardians.guardianId, guardians.id))
    .innerJoin(students, eq(students.id, studentGuardians.studentId))
    .innerJoin(classStudents, eq(classStudents.studentId, students.id))
    .innerJoin(classes, eq(classes.id, classStudents.classId))
    .innerJoin(schoolYears, eq(schoolYears.id, classes.schoolYearId))
    .leftJoin(
      studentScoreSnapshots,
      and(
        eq(studentScoreSnapshots.studentId, students.id),
        eq(studentScoreSnapshots.classId, classes.id),
      ),
    )
    .where(
      and(
        eq(guardians.userId, userId),
        eq(users.status, "active"),
        eq(studentGuardians.canView, true),
        isNull(classStudents.leftAt),
        eq(students.status, "active"),
        eq(students.organizationId, classes.organizationId),
      ),
    )
    .orderBy(asc(students.fullName));
}

export async function getGuardianStudentActivity(userId: string, studentId: string) {
  const [relation] = await db
    .select({ studentId: studentGuardians.studentId })
    .from(guardians)
    .innerJoin(users, eq(users.id, guardians.userId))
    .innerJoin(studentGuardians, eq(studentGuardians.guardianId, guardians.id))
    .where(
      and(
        eq(guardians.userId, userId),
        eq(users.status, "active"),
        eq(studentGuardians.studentId, studentId),
        eq(studentGuardians.canView, true),
      ),
    )
    .limit(1);

  if (!relation) {
    throw new Error("FORBIDDEN_STUDENT_ACCESS");
  }

  return db
    .select({
      id: scoreTransactions.id,
      reason: scoreTransactions.reason,
      lifetimeDelta: scoreTransactions.lifetimeDelta,
      spendableDelta: scoreTransactions.spendableDelta,
      occurredAt: scoreTransactions.occurredAt,
    })
    .from(scoreTransactions)
    .innerJoin(
      classStudents,
      and(
        eq(classStudents.classId, scoreTransactions.classId),
        eq(classStudents.studentId, scoreTransactions.studentId),
      ),
    )
    .where(and(eq(scoreTransactions.studentId, studentId), isNull(classStudents.leftAt)))
    .orderBy(desc(scoreTransactions.occurredAt))
    .limit(50);
}

export async function getClassAnalytics(userId: string, classId: string) {
  const classContext = await getTeacherClass(userId, classId);
  if (!classContext) {
    throw new Error("FORBIDDEN_CLASS_ACCESS");
  }

  const [totals, behaviorBreakdown, dailyScores, taskStats, badgeStats, rewardStats] = await Promise.all([
    db
      .select({
        studentCount: sql<number>`count(distinct ${classStudents.studentId})`,
        lifetimeScore: sql<number>`coalesce(sum(${scoreTransactions.lifetimeDelta}), 0)`,
        spendableDelta: sql<number>`coalesce(sum(${scoreTransactions.spendableDelta}), 0)`,
      })
      .from(classStudents)
      .leftJoin(
        scoreTransactions,
        and(
          eq(scoreTransactions.classId, classStudents.classId),
          eq(scoreTransactions.studentId, classStudents.studentId),
        ),
      )
      .where(and(eq(classStudents.classId, classId), isNull(classStudents.leftAt))),
    db
      .select({
        transactionType: scoreTransactions.transactionType,
        total: sql<number>`coalesce(sum(${scoreTransactions.lifetimeDelta}), 0)`,
      })
      .from(scoreTransactions)
      .where(eq(scoreTransactions.classId, classId))
      .groupBy(scoreTransactions.transactionType)
      .orderBy(desc(sql`sum(${scoreTransactions.lifetimeDelta})`)),
    db
      .select({
        day: sql<string>`to_char(date_trunc('day', ${scoreTransactions.occurredAt}), 'YYYY-MM-DD')`,
        total: sql<number>`coalesce(sum(${scoreTransactions.lifetimeDelta}), 0)`,
      })
      .from(scoreTransactions)
      .where(
        and(
          eq(scoreTransactions.classId, classId),
          sql`${scoreTransactions.occurredAt} >= now() - interval '30 days'`,
        ),
      )
      .groupBy(sql`date_trunc('day', ${scoreTransactions.occurredAt})`)
      .orderBy(asc(sql`date_trunc('day', ${scoreTransactions.occurredAt})`)),
    db
      .select({
        totalAssignments: sql<number>`count(${taskAssignments.id})`,
        completedAssignments: sql<number>`count(${taskAssignments.id}) filter (where ${taskAssignments.status} = 'completed')`,
      })
      .from(tasks)
      .leftJoin(taskAssignments, eq(taskAssignments.taskId, tasks.id))
      .where(eq(tasks.classId, classId)),
    db
      .select({ total: sql<number>`count(${studentBadges.id})` })
      .from(studentBadges)
      .where(eq(studentBadges.classId, classId)),
    db
      .select({ total: sql<number>`count(${rewardRedemptions.id})` })
      .from(rewardRedemptions)
      .where(eq(rewardRedemptions.classId, classId)),
  ]);

  return {
    classContext,
    totals: totals[0] ?? null,
    behaviorBreakdown,
    dailyScores,
    taskStats: taskStats[0] ?? { totalAssignments: 0, completedAssignments: 0 },
    badgesEarned: badgeStats[0]?.total ?? 0,
    rewardRedemptions: rewardStats[0]?.total ?? 0,
  };
}

export async function getClassConfiguration(userId: string, classId: string) {
  const classContext = await getTeacherClass(userId, classId);
  if (!classContext) {
    throw new Error("FORBIDDEN_CLASS_ACCESS");
  }

  const [levels, tasksData] = await Promise.all([
    db
      .select()
      .from(levelDefinitions)
      .where(or(eq(levelDefinitions.classId, classId), isNull(levelDefinitions.classId)))
      .orderBy(asc(levelDefinitions.sortOrder)),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        dueAt: tasks.dueAt,
        assignmentCount: sql<number>`count(${taskAssignments.id})`,
      })
      .from(tasks)
      .leftJoin(taskAssignments, eq(taskAssignments.taskId, tasks.id))
      .where(eq(tasks.classId, classId))
      .groupBy(tasks.id)
      .orderBy(desc(tasks.dueAt)),
  ]);

  return { classContext, levels, tasks: tasksData };
}

export { teacherRoles };
