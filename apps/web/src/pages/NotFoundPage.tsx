import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <h1 className="mb-2 text-4xl font-bold">404</h1>
      <p className="mb-4 text-muted-foreground">页面不存在</p>
      <Link to="/" className="text-primary underline">
        返回首页
      </Link>
    </main>
  )
}
