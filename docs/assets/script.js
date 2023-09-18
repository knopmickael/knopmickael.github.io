window.addEventListener("DOMContentLoaded", function () {
  const setLang = (e) => {
    const data = typeof e === "string" ? e : e.target.value;
    const getJobContent = (lang) => {
      const jobs = [
        {
          year: 2021,
          company: "PlanMob",
          role: "Mid-level Back-end",
          cargo: "Back-end Pleno",
          description:
            "Sustained a products delivering Node/Express API. Realized thirdy-party services integration with AWS and created a V2 API with PHP/Slim Framework using OAuth2, Eloquent for Mongo, clean arch, TDD e Postman.",
          descricao:
            "Sustentei uma API de delivery de produtos em Node/Express. Realizei integrações com serviços da AWS e criei uma API V2 com PHP/Slim Framework usando OAuth2, Eloquent para MongoDB, arquitetura limpa, TDD e documentada via Postman.",
        },
        {
          year: 2020,
          company: "TrioMidia",
          role: "Jr. Full-stack",
          cargo: "Full-stack Jr.",
          description:
            "Developed institutional, e-commerce and CMS applications using Laravel and Vue.js with MySQL, and mobile MVPs using Expo. Was also responsible for the app's infra.",
          descricao:
            "Desenvolvi websites institucionais, e-commerce com carrinho de produto, gestão de usuários, controle de estoque, gerenciadores de conteúdo em Laravel e Vue.js com MySQL. Também criei aplicativos simples com Expo para dispositivos móveis.",
        },
      ];

      let jobContent = ``;
      for (const job of jobs) {
        jobContent += `
          <div class="space-y-4 lg:space-y-8">
            <div class="flex space-x-4 justify-between items-center">
              <span class="text-xl lg:text-2xl">${job.year}</span>
              <span class="flex-1 h-1 bg-orange-500"></span>
              <div class="text-right">
                <h2 class="text-2xl lg:text-3xl font-extrabold">${
                  job.company
                }</h2>
                <span class="text-xs text-orange-400">${
                  data === "en-US" ? job.role : job.cargo
                }</span>
              </div>
            </div>
            <div class="lg:flex lg:justify-end">
              <p class="text-justify text-xs lg:text-2xl lg:w-1/2 lg:font-thin">${
                data === "en-US" ? job.description : job.descricao
              }</p>
            </div>
          </div>
        `;
      }

      return jobContent;
    };
    switch (data) {
      case "en-US":
        document.querySelector("#hero-title").innerText = "Software Engineer";
        document.querySelector("#hero-see-more-btn").innerText = "See more";

        document.querySelector("#about-title").innerText = "About me";
        document.querySelector("#about-bio").innerHTML = `
          <p>
            I am a software developer with experience in building and maintaining mobile and web applications, as well as managing its infrastructure.
          </p>
          <p>
            I have strong experience in front-end using technologies such as React and Angular in web applications, and Expo and Ionic for mobile applications. I also have a deep understanding of back-end engineering using Node.js, PHP and Laravel, as well as domain knowledge of relational and non-relational databases such as MySQL and MongoDB, respectively.
          </p>
          <p>
            I also have experience in agile culture and DevOps, including container management, horizontal scalability, monitoring, creating integration and deployment pipelines, and other principles of distributed applications.
          </p>
        `;
        document.querySelector("#about-cv-link").innerHTML = `
          <a href="./assets/mickael-knop-enus.pdf"
            target="_blank"
            download
            class="text-xs lg:text-lg absolute bottom-4 lg:right-10 text-black hover:underline">Download my CV here</a>
        `;

        document.querySelector("#experience-title").innerText =
          "Profissional Experience";

        document.querySelector("#experience-jobs").innerHTML =
          getJobContent(data);

        document.querySelector("#projects-title").innerText = "Side projects";

        document.querySelector("#footer-text").innerText =
          "All Rights Reserved.";
        break;
      case "pt-BR":
        document.querySelector("#hero-title").innerText =
          "Desenvolvedor de Software";
        document.querySelector("#hero-see-more-btn").innerText = "Ver mais";

        document.querySelector("#about-title").innerText = "Sobre mim";
        document.querySelector("#about-bio").innerHTML = `
          <p>
            Sou um desenvolvedor de software com vivência na construção e manutenção de aplicativos móveis e web, bem como na gestão da infraestrutura das aplicações.
          </p>
          <p>
            Tenho forte experiência em front-end usando tecnologias como React e Angular em aplicações web, e Expo e Ionic para aplicações mobile. Também tenho profundo conhecimento em engenharia de back-end usando Node.js, PHP e Laravel, além de domínio de bancos relacionais e não-relacionais como MySQL e MongoDB, respectivamente.
          </p>
          <p>
            Também possuo experiência em cultura ágil e DevOps, incluindo gerenciamento de containers, escalabilidade horizontal, monitoramento, criação de pipelines de integração e de deployment, entre outros princípios de aplicações distribuídas.
          </p>
        `;
        document.querySelector("#about-cv-link").innerHTML = `
          <a href="./assets/mickael-knop-ptbr.pdf"
            target="_blank"
            download
            class="text-xs lg:text-lg absolute bottom-4 lg:right-10 text-black hover:underline">Baixe meu currículo</a>
        `;

        document.querySelector("#experience-title").innerText =
          "Experiência Profissional";

        document.querySelector("#experience-jobs").innerHTML =
          getJobContent(data);

        document.querySelector("#projects-title").innerText =
          "Projetos pessoais";

        document.querySelector("#footer-text").innerText =
          "Todos direitos reservados.";
        break;
    }
  };

  document.querySelector("#langToggler").addEventListener("change", setLang);
  setLang("pt-BR");
});
