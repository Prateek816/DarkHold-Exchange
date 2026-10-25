const fs = require('fs');
let code = fs.readFileSync('app/login/page.tsx', 'utf8');

const oldBlock = `    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const isOperator = email.includes('admin') || email.includes('operator');
      const isIssuer = email.includes('issuer');
      const role = isOperator ? 'OPERATOR' : isIssuer ? 'ISSUER' : 'USER';

      setUser(
        {
          id: \`usr-\${email.split('@')[0]}\`,
          email,
          role,
        },
        'token-jwt-simulated-9988'
      );
      setWallet({
        available_balance: isOperator ? 500000 : 150000,
        reserved_balance: 27800,
        total_balance: isOperator ? 527800 : 177800,
      });

      pushToast({
        variant: 'success',
        title: isRegister ? 'Account Registered' : 'Signed In',
        body: \`Welcome to Darkhold Exchange. Signed in as \${role}.\`,
      });

      signInTransition('/market');
    }, 500);`;

const newBlock = `    setLoading(true);
    const isOperator = email.includes('admin') || email.includes('operator');
    const isIssuer = email.includes('issuer');
    const role = isOperator ? 'OPERATOR' : isIssuer ? 'ISSUER' : 'USER';

    setUser(
      {
        id: \`usr-\${email.split('@')[0]}\`,
        email,
        role,
      },
      'token-jwt-simulated-9988'
    );
    setWallet({
      available_balance: isOperator ? 500000 : 150000,
      reserved_balance: 27800,
      total_balance: isOperator ? 527800 : 177800,
    });

    pushToast({
      variant: 'success',
      title: isRegister ? 'Account Registered' : 'Signed In',
      body: \`Welcome to Darkhold Exchange. Signed in as \${role}.\`,
    });

    signInTransition('/market');`;

code = code.replace(oldBlock.replace(/\r?\n/g, '\r\n'), newBlock.replace(/\r?\n/g, '\r\n'));
if (!code.includes("signInTransition('/market');\r\n  };") && !code.includes("signInTransition('/market');\n  };")) {
  // If not replaced due to CRLF, try normalizing
  code = code.replace(
    /setLoading\(true\);\s*setTimeout\(\(\) => \{[\s\S]*?signInTransition\('\/market'\);\s*\}, 500\);/,
    `setLoading(true);
    const isOperator = email.includes('admin') || email.includes('operator');
    const isIssuer = email.includes('issuer');
    const role = isOperator ? 'OPERATOR' : isIssuer ? 'ISSUER' : 'USER';

    setUser(
      {
        id: \`usr-\${email.split('@')[0]}\`,
        email,
        role,
      },
      'token-jwt-simulated-9988'
    );
    setWallet({
      available_balance: isOperator ? 500000 : 150000,
      reserved_balance: 27800,
      total_balance: isOperator ? 527800 : 177800,
    });

    pushToast({
      variant: 'success',
      title: isRegister ? 'Account Registered' : 'Signed In',
      body: \`Welcome to Darkhold Exchange. Signed in as \${role}.\`,
    });

    signInTransition('/market');`
  );
}

fs.writeFileSync('app/login/page.tsx', code, 'utf8');
console.log('Login page updated with instant portal transition');
