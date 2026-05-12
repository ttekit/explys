export const maskEmail = (email: string | undefined) => {
  if (!email) return "Loading...";
  
  const [name, domain] = email.split("@");
  if (!name || !domain) return email;

  if (name.length <= 3) return email;

  const start = name.slice(0, 1);
  const end = name.slice(-2);
  const stars = "*".repeat(name.length - 3); 
  
  return `${start}${stars}${end}@${domain}`;
};