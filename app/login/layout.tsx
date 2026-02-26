export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Hide the global NavBar on the login page via CSS */}
      <style>{`header { display: none !important; }`}</style>
      {children}
    </>
  )
}
