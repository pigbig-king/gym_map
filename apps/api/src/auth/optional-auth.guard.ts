import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class OptionalAuthGuard extends AuthGuard('jwt') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleRequest(err: any, user: any): any {
    if (err || !user) return null
    return user
  }
}
