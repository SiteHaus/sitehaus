export class UserExistsError extends Error {
  constructor(public readonly email: string) {
    super('User already exists');
    this.name = 'UserExistsError';
  }
}
