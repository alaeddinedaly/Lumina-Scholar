import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { Role } from 'shared-types';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(data: any) {
    const { email, password, name, role, tenantName } = data;

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) throw new BadRequestException('Email already exists');

    let tenantIdStr = '';

    if (role === Role.PROFESSOR) {
      let tenant = await this.prisma.tenant.findFirst({
        where: { name: { equals: tenantName, mode: 'insensitive' } }
      });
      if (!tenant) {
        tenant = await this.prisma.tenant.create({
          data: { name: tenantName },
        });
      }
      tenantIdStr = tenant.id;
    } else if (role === Role.STUDENT) {
      let existingTenant = await this.prisma.tenant.findFirst({
        where: { name: { equals: tenantName, mode: 'insensitive' } },
      });
      
      let courseToEnroll = null;
      if (!existingTenant) {
        // Fallback: Check if they typed a Course Name instead
        courseToEnroll = await this.prisma.course.findFirst({
          where: { name: { equals: tenantName, mode: 'insensitive' } }
        });
        if (courseToEnroll) {
          existingTenant = await this.prisma.tenant.findUnique({ where: { id: courseToEnroll.tenantId } });
        }
      }

      if (!existingTenant) throw new BadRequestException('Department or Class not found');
      tenantIdStr = existingTenant.id;
      
      // We will attach the specific course check logic below
      data._courseToEnroll = courseToEnroll;
    } else {
      throw new BadRequestException('Invalid role');
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        tenantId: tenantIdStr,
      },
    });

    if (role === Role.STUDENT) {
      if (data._courseToEnroll) {
        await this.prisma.enrollment.create({
          data: { studentId: user.id, courseId: data._courseToEnroll.id }
        });
      }
      // If they joined a general Tenant instead of a specific Course,
      // they will have 0 initial enrollments. The professor must manually enroll them.
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };
  }

  async login(data: any) {
    const { email, password } = data;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId };
    
    const access_token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
    });

    const refresh_token = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRY', '7d'),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      tokens: { access_token, refresh_token },
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });
      const newPayload = { sub: payload.sub, email: payload.email, role: payload.role, tenantId: payload.tenantId };
      const access_token = this.jwtService.sign(newPayload, {
        secret: this.configService.get('JWT_ACCESS_SECRET'),
        expiresIn: this.configService.get('JWT_ACCESS_EXPIRY', '15m'),
      });
      return { access_token };
    } catch (e) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, tenantId: true, tenant: true },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  async getDebug() {
    return {
      docs: await this.prisma.document.findMany(),
      enrollments: await this.prisma.enrollment.findMany(),
      courses: await this.prisma.course.findMany()
    };
  }

  async getTenants() {
    const tenants = await this.prisma.tenant.findMany({ select: { name: true } });
    const courses = await this.prisma.course.findMany({ select: { name: true } });
    
    // Merge without duplicates
    const allNames = new Set([
      ...tenants.map(t => t.name),
      ...courses.map(c => c.name)
    ]);
    
    return Array.from(allNames).sort((a, b) => a.localeCompare(b));
  }
}
