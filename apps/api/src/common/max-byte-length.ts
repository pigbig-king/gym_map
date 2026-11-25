import { ValidateBy } from 'class-validator'

export function MaxByteLength(max: number) {
  return ValidateBy({
    name: 'maxByteLength',
    validator: {
      validate: (value: unknown) => typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
      defaultMessage: () => `密码的 UTF-8 编码不能超过 ${max} 字节`,
    },
  })
}
