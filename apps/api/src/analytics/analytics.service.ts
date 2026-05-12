import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getProfessorAnalytics(user: any) {
    const courses = await this.prisma.course.findMany({
      where: { professorId: user.userId, tenantId: user.tenantId },
      include: {
        documents: {
          where: { isAssignment: true },
        },
        enrollments: {
          include: {
            student: {
              include: {
                submissions: true,
                messages: true
              }
            }
          }
        }
      }
    });

    return courses.map(course => {
      const assignmentCount = course.documents.length;
      
      const enrollmentsWithMetrics = course.enrollments.map(enrollment => {
        const student = enrollment.student;
        
        // Only count submissions for assignments in THIS course
        const courseAssignmentIds = course.documents.map(d => d.id);
        const courseSubmissions = student.submissions.filter(s => courseAssignmentIds.includes(s.documentId));
        
        // Completion rate
        let completionRate = 0;
        if (assignmentCount > 0) {
          completionRate = Math.round((courseSubmissions.length / assignmentCount) * 100);
        }

        // Average score (only from submissions that have a score)
        const gradedSubmissions = courseSubmissions.filter(s => s.score !== null);
        let averageScore = 0;
        if (gradedSubmissions.length > 0) {
          const totalScore = gradedSubmissions.reduce((sum, s) => sum + (s.score ?? 0), 0);
          averageScore = Math.round(totalScore / gradedSubmissions.length);
        } else {
            // Default baseline if no submissions yet to make charts visually functional in testing
            averageScore = 0; 
        }

        // Messages in this course context or overall
        // Lumina tracks courseId in messages, let's filter by it
        const queriesAsked = student.messages.filter((m: any) => m.courseId === course.id || m.courseId === null).length;

        // Deadline tracking
        let missedDeadlines = 0;
        let onTimeSubmissions = 0;
        let lateSubmissions = 0;
        const now = new Date();

        course.documents.forEach(assignment => {
          const submission = courseSubmissions.find(s => s.documentId === assignment.id);
          if (submission) {
            if (assignment.deadline && new Date(submission.submittedAt) > new Date(assignment.deadline)) {
              lateSubmissions++;
            } else {
              onTimeSubmissions++;
            }
          } else {
            if (assignment.deadline && new Date(assignment.deadline) < now) {
              missedDeadlines++;
            }
          }
        });

        return {
          ...enrollment,
          student: {
            id: student.id,
            name: student.name,
            email: student.email,
            role: student.role,
            queriesAsked,
            averageScore,
            completionRate,
            missedDeadlines,
            onTimeSubmissions,
            lateSubmissions
          }
        };
      });

      return {
        id: course.id,
        name: course.name,
        enrollments: enrollmentsWithMetrics
      };
    });
  }

  async getSubmissionsForGrading(user: any) {
    const courses = await this.prisma.course.findMany({
      where: { professorId: user.userId, tenantId: user.tenantId },
      include: {
        documents: {
          where: { isAssignment: true },
          orderBy: { createdAt: 'desc' },
          include: {
            submissions: {
              include: {
                student: {
                  select: { id: true, name: true, email: true },
                },
              },
              orderBy: { submittedAt: 'desc' },
            },
          },
        },
      },
    });

    return courses.map(course => ({
      id: course.id,
      name: course.name,
      assignments: course.documents.map(doc => ({
        id: doc.id,
        name: doc.originalName,
        deadline: doc.deadline,
        submissions: doc.submissions.map(sub => ({
          submissionId: sub.id,
          studentId: sub.studentId,
          studentName: sub.student.name,
          studentEmail: sub.student.email,
          score: sub.score,
          submittedAt: sub.submittedAt,
          submissionFileName: sub.submissionFileName ?? null,
          hasFile: !!sub.submissionFilePath,
        })),
      })),
    }));
  }
}
