// Pure template strings and source-generating functions for project scaffolding.
// No filesystem or path imports — keep this file side-effect free.

export const APPLICATION_DEV_YAML = `spring:
  security:
    oauth2:
      client:
        registration:
          microsoft:
            provider: microsoft
            client-id: \${MS_CLIENT_ID}
            client-secret: \${MS_CLIENT_SECRET}
            client-name: Microsoft
            scope: openid, profile, email
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
        provider:
          microsoft:
            issuer-uri: https://login.microsoftonline.com/\${MS_TENANT_ID}/v2.0
            user-name-attribute: name
`;

export const APPLICATION_TEST_YAML = `spring:
  security:
    oauth2:
      client:
        registration:
          test-microsoft:
            provider: test-microsoft
            client-id: test-client-id
            client-secret: test-client-secret
            scope: openid, profile, email
            authorization-grant-type: authorization_code
            redirect-uri: "{baseUrl}/login/oauth2/code/{registrationId}"
        provider:
          test-microsoft:
            authorization-uri: https://example.invalid/authorize
            token-uri: https://example.invalid/token
            user-info-uri: https://example.invalid/userinfo
            jwk-set-uri: https://example.invalid/jwks
            user-name-attribute: sub
`;

export function securityConfigSource(packageName) {
  return `package ${packageName}.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth.requestMatchers("/error", "/actuator/health")
                        .permitAll()
                        .anyRequest()
                        .authenticated())
                .oauth2Login(login -> login.defaultSuccessUrl("/me", true))
                .logout(logout -> logout.logoutSuccessUrl("/"));
        return http.build();
    }
}
`;
}

export function homeControllerSource(packageName) {
  return `package ${packageName}.home.controller;

import java.util.Map;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.oidc.user.OidcUser;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/me")
    public Map<String, Object> me(@AuthenticationPrincipal OidcUser user) {
        return Map.of(
                "name", user.getFullName(),
                "email", user.getEmail(),
                "subject", user.getSubject());
    }
}
`;
}

export function mvcIntegrationTestAnnotationSource(packageName) {
  return `package ${packageName};

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;

@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfiguration.class)
public @interface MvcIntegrationTest {}
`;
}

export function homeControllerTestsSource(packageName) {
  return `package ${packageName}.home.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oidcLogin;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrlPattern;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.web.servlet.MockMvc;

import ${packageName}.MvcIntegrationTest;

@MvcIntegrationTest
class HomeControllerTests {

    @Autowired
    MockMvc mockMvc;

    @Test
    void healthIsPublic() throws Exception {
        mockMvc.perform(get("/actuator/health")).andExpect(status().isOk());
    }

    @Test
    void unauthenticatedMeRedirectsToOAuth2Login() throws Exception {
        mockMvc.perform(get("/me"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrlPattern("/oauth2/authorization/*"));
    }

    @Test
    void meReturnsClaimsForOidcUser() throws Exception {
        mockMvc.perform(get("/me").with(oidcLogin().idToken(token -> token.subject("sub-123")
                        .claim("name", "Jane Doe")
                        .claim("email", "jane@example.com"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Jane Doe"))
                .andExpect(jsonPath("$.email").value("jane@example.com"))
                .andExpect(jsonPath("$.subject").value("sub-123"));
    }
}
`;
}

export function archUnitDependenciesBlock({ archUnitVersion, archUnitSpringVersion }) {
  return `	testImplementation 'com.tngtech.archunit:archunit-junit5:${archUnitVersion}'
	testImplementation 'de.rweisleder:archunit-spring:${archUnitSpringVersion}'
`;
}

export function architectureTestSource(packageName) {
  return `package ${packageName};

import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.classes;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.fields;
import static com.tngtech.archunit.lang.syntax.ArchRuleDefinition.noClasses;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_THROW_GENERIC_EXCEPTIONS;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;
import static com.tngtech.archunit.library.GeneralCodingRules.NO_CLASSES_SHOULD_USE_JODATIME;

import org.springframework.context.annotation.Configuration;
import org.springframework.stereotype.Controller;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RestController;

import com.tngtech.archunit.core.importer.ImportOption;
import com.tngtech.archunit.junit.AnalyzeClasses;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.library.dependencies.SlicesRuleDefinition;

import de.rweisleder.archunit.spring.framework.SpringControllerRules;

@AnalyzeClasses(
        packages = "${packageName}",
        importOptions = {ImportOption.DoNotIncludeTests.class, ImportOption.DoNotIncludeJars.class})
class ArchitectureTest {

    // --- Feature-based package boundaries ---

    @ArchTest
    static final ArchRule no_cycles_between_feature_packages = SlicesRuleDefinition.slices()
            .matching("${packageName}.(*)..")
            .should()
            .beFreeOfCycles();

    @ArchTest
    static final ArchRule controllers_should_not_depend_on_spring_data = noClasses()
            .that()
            .areAnnotatedWith(RestController.class)
            .or()
            .areAnnotatedWith(Controller.class)
            .should()
            .dependOnClassesThat()
            .resideInAPackage("org.springframework.data..")
            .because("controllers must go through a service, never reach the data layer directly");

    // --- Spring stereotype conventions ---

    @ArchTest
    static final ArchRule rest_controllers_live_in_controller_package = classes()
            .that()
            .areAnnotatedWith(RestController.class)
            .or()
            .areAnnotatedWith(Controller.class)
            .should()
            .resideInAPackage("..controller..")
            .andShould()
            .haveSimpleNameEndingWith("Controller");

    @ArchTest
    static final ArchRule services_live_in_service_package = classes()
            .that()
            .areAnnotatedWith(Service.class)
            .should()
            .resideInAPackage("..service..")
            .andShould()
            .haveSimpleNameEndingWith("Service")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule repositories_live_in_repository_package = classes()
            .that()
            .haveSimpleNameEndingWith("Repository")
            .should()
            .resideInAPackage("..repository..")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule repository_package_only_holds_repositories = classes()
            .that()
            .resideInAPackage("..repository..")
            .should()
            .haveSimpleNameEndingWith("Repository")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule configurations_live_in_config_package =
            classes().that().areAnnotatedWith(Configuration.class).should().resideInAPackage("..config..");

    // --- Coding-practice guards ---

    @ArchTest
    static final ArchRule fields_should_not_use_autowired = fields().should()
            .notBeAnnotatedWith("org.springframework.beans.factory.annotation.Autowired")
            .andShould()
            .notBeAnnotatedWith("jakarta.annotation.Resource")
            .andShould()
            .notBeAnnotatedWith("jakarta.inject.Inject")
            .because("use constructor injection (Lombok @RequiredArgsConstructor) — see CLAUDE.md")
            .allowEmptyShould(true);

    @ArchTest
    static final ArchRule no_generic_exceptions = NO_CLASSES_SHOULD_THROW_GENERIC_EXCEPTIONS;

    @ArchTest
    static final ArchRule no_java_util_logging = NO_CLASSES_SHOULD_USE_JAVA_UTIL_LOGGING;

    @ArchTest
    static final ArchRule no_jodatime = NO_CLASSES_SHOULD_USE_JODATIME;

    @ArchTest
    static final ArchRule no_standard_streams = NO_CLASSES_SHOULD_ACCESS_STANDARD_STREAMS;

    // --- Predefined Spring rules (rweisleder/archunit-spring) ---

    @ArchTest
    static final ArchRule controller_must_have_request_mapping =
            SpringControllerRules.ControllerNameWithoutRequestMapping;
}
`;
}

export function openApiMappingYaml(groupId) {
  return `openapi-processor-mapping: v9
options:
  package-name: ${groupId}.api
  model-type: record
  bean-validation: jakarta
  javadoc: false
  generated-date: false
  format-code: false
`;
}

export function spotlessGradleBlock({ pluginVersion }) {
  return {
    pluginLine: `\n    id 'com.diffplug.spotless' version '${pluginVersion}'`,
    appended: `
spotless {
    ratchetFrom 'origin/master'

    java {
        target 'src/*/java/**/*.java'
        toggleOffOn()

        // Use Spotless's bundled palantir-java-format default — pinning older
        // versions breaks on JDK 25 due to javac internal API changes.
        palantirJavaFormat().formatJavadoc(true)

        importOrder 'java', 'javax', 'org', 'com', ''
        removeUnusedImports()
        formatAnnotations()
        forbidWildcardImports()
    }
}

compileJava.dependsOn tasks.named('spotlessApply')
`,
  };
}

export function openApiProcessorGradleBlock({ pluginVersion, springVersion, relSpec }) {
  return {
    pluginLine: `\n    id 'io.openapiprocessor.openapi-processor' version '${pluginVersion}'`,
    appended: `
openapiProcessor {
    spring {
        processor "io.openapiprocessor:openapi-processor-spring:${springVersion}"
        apiPath "$rootDir/${relSpec}"
        mapping "$projectDir/src/api/mapping.yaml"
        targetDir layout.buildDirectory.dir("openapi/java").get().asFile.toString()
        parser "INTERNAL"
    }
}

sourceSets {
    main {
        java {
            srcDir layout.buildDirectory.dir("openapi/java")
        }
    }
}

compileJava.dependsOn tasks.named('processSpring')
`,
  };
}
